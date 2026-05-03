import pandas as pd
import numpy as np
import json
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier, _tree, export_text
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.neighbors import NearestNeighbors

def serialize_tree(tree, feature_names, node_id=0, max_depth=4, current_depth=0):
    if current_depth >= max_depth or tree.children_left[node_id] == tree.children_right[node_id]:
        # leaf
        class_counts = tree.value[node_id][0]
        class_idx = int(np.argmax(class_counts))
        return {"type": "leaf", "class_idx": class_idx}
    else:
        return {
            "type": "node",
            "feature": feature_names[tree.feature[node_id]],
            "threshold": round(float(tree.threshold[node_id]), 2),
            "left": serialize_tree(tree, feature_names, tree.children_left[node_id], max_depth, current_depth + 1),
            "right": serialize_tree(tree, feature_names, tree.children_right[node_id], max_depth, current_depth + 1)
        }

def get_model_representations(trained_pipelines, numeric_features, categorical_features, knn_model=None):
    """Extract human-readable representations for all models and return as a dict."""
    # Get feature names from first pipeline's fitted preprocessor
    first_pipeline = list(trained_pipelines.values())[0]
    prep     = first_pipeline.named_steps['preprocessor']
    cat_enc  = prep.named_transformers_['cat']
    cat_cols = cat_enc.get_feature_names_out(categorical_features).tolist()
    feat_names = numeric_features + cat_cols
    class_names = list(first_pipeline.classes_)

    reps = {}

    for model_name, pipeline in trained_pipelines.items():
        model = pipeline.named_steps['classifier']
        rep   = {"model_name": model_name}

        # ── Decision Tree ────────────────────────────────────────
        if model_name == 'Decision Tree':
            rep["depth"]   = int(model.get_depth())
            rep["n_nodes"] = int(model.tree_.node_count)
            rep["n_leaves"]= int(model.tree_.n_leaves)
            rep["rules"]   = export_text(model, feature_names=feat_names, max_depth=3)
            rep["tree_structure"] = serialize_tree(model.tree_, feat_names, max_depth=3)
            rep["classes"] = class_names

        # ── Random Forest ────────────────────────────────────────
        elif model_name == 'Random Forest':
            importances = model.feature_importances_
            fi = sorted(zip(feat_names, importances), key=lambda x: x[1], reverse=True)[:8]
            rep["n_estimators"]     = model.n_estimators
            rep["feature_importance"] = [{"feature": f, "importance": round(float(v), 4)} for f, v in fi]
            rep["sample_trees"] = [
                {"tree_index": i+1,
                 "rules": export_text(model.estimators_[i], feature_names=feat_names, max_depth=2),
                 "tree_structure": serialize_tree(model.estimators_[i].tree_, feat_names, max_depth=2)}
                for i in range(min(1, len(model.estimators_)))
            ]

        # ── Gradient Boosting ────────────────────────────────────
        elif model_name == 'Gradient Boosting':
            rep["n_estimators"]  = model.n_estimators
            rep["learning_rate"] = model.learning_rate
            rep["max_depth"]     = model.max_depth
            rep["sample_trees"] = [
                {"tree_index": i+1,
                 "rules": export_text(model.estimators_[i][0], feature_names=feat_names, max_depth=2),
                 "tree_structure": serialize_tree(model.estimators_[i][0].tree_, feat_names, max_depth=2)}
                for i in range(min(1, model.n_estimators_))
            ]

        # ── Logistic Regression ──────────────────────────────────
        elif model_name == 'Logistic Regression':
            coefs      = model.coef_           # (n_classes, n_features)
            intercepts = model.intercept_
            equations  = []
            for i, cls in enumerate(model.classes_):
                top_terms = sorted(
                    zip(feat_names, coefs[i]),
                    key=lambda x: abs(x[1]), reverse=True
                )[:6]
                terms = " + ".join([f"({v:.3f})*{f}" for f, v in top_terms])
                equations.append(f"z[{cls}] = {terms} + ({intercepts[i]:.3f})")
            avg_abs = np.mean(np.abs(coefs), axis=0)
            fi = sorted(zip(feat_names, avg_abs), key=lambda x: x[1], reverse=True)[:8]
            rep["equations"]       = equations
            rep["feature_importance"] = [{"feature": f, "weight": round(float(v), 4)} for f, v in fi]

        reps[model_name] = rep

    # ── KNN Food Recommender ─────────────────────────────────────
    if knn_model is not None:
        reps["KNN Food Recommender"] = {
            "model_name": "KNN Food Recommender",
            "k":          knn_model.n_neighbors,
            "metric":     knn_model.metric,
            "algorithm":  knn_model.algorithm if knn_model.algorithm != 'auto' else 'brute (auto)',
            "description": "Finds K nearest food items in nutritional space using Cosine Similarity.",
            "input_vector_example": {"Calories": 450, "Protein": 40, "Carbs": 30, "Fats": 12},
        }

    return reps

def generate_health_data(num_records=15000):
    np.random.seed(42)
    age = np.random.randint(18, 65, num_records)
    gender = np.random.choice(['Male', 'Female'], num_records)
    height = np.random.normal(1.70, 0.1, num_records)
    weight = np.random.normal(70, 15, num_records)
    bmi = weight / (height ** 2)
    activity_level = np.random.choice(['Low', 'Medium', 'High', 'Very High'], num_records, p=[0.2, 0.4, 0.3, 0.1])
    sleep_hours = np.random.normal(7, 1.5, num_records).clip(4, 12)
    water_intake = np.random.normal(2.5, 0.8, num_records).clip(1, 6)
    
    # 5 specific user goals now
    goals = ['Weight Loss', 'Weight Gain', 'Maintain', 'Bodybuilding', 'General Health']
    goal = np.random.choice(goals, num_records, p=[0.3, 0.2, 0.2, 0.15, 0.15])
    
    diet_type = []
    for i in range(num_records):
        g = goal[i]
        b = bmi[i]
        a = activity_level[i]
        
        # Heuristic mapping for the 5 categories
        if g == 'Bodybuilding' or (a in ['High', 'Very High'] and g == 'Weight Gain'):
            diet_type.append('Bodybuilding')
        elif g == 'General Health' or (g == 'Maintain' and a == 'Low'):
            diet_type.append('Health & Wellness')
        elif g == 'Weight Loss' or b > 27:
            diet_type.append('Weight Loss')
        elif g == 'Weight Gain' or b < 18.5:
            diet_type.append('Weight Gain')
        else:
            diet_type.append('Balanced')
            
    # Add noise to simulate real-world fuzziness (10% noise)
    noise_indices = np.random.choice(num_records, int(num_records * 0.1), replace=False)
    for idx in noise_indices:
        diet_type[idx] = np.random.choice(['Weight Loss', 'Weight Gain', 'Balanced', 'Bodybuilding', 'Health & Wellness'])
        
    df = pd.DataFrame({
        'Age': age, 'Gender': gender, 'Height': height, 'Weight': weight, 'BMI': bmi,
        'Activity Level': activity_level, 'Sleep Hours': sleep_hours, 'Water Intake': water_intake,
        'Goal': goal, 'Diet Type': diet_type
    })
    os.makedirs('../dataset', exist_ok=True)
    df.to_csv('../dataset/data.csv', index=False)
    return df



def train_health_models(df):
    X = df.drop('Diet Type', axis=1)
    y = df['Diet Type']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    numeric_features = ['Age', 'Height', 'Weight', 'BMI', 'Sleep Hours', 'Water Intake']
    categorical_features = ['Gender', 'Activity Level', 'Goal']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(random_state=42)
    }
    
    metrics = {}
    best_model = None
    best_accuracy = 0
    best_model_name = ""
    trained_pipelines = {}  # track all for get_model_representations
    
    for name, model in models.items():
        pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('classifier', model)])
        pipeline.fit(X_train, y_train)
        trained_pipelines[name] = pipeline
        y_pred = pipeline.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='macro', zero_division=0)
        rec = recall_score(y_test, y_pred, average='macro', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)
        
        # Calculate Confusion Matrix
        cm = confusion_matrix(y_test, y_pred, labels=pipeline.classes_).tolist()
        
        # Calculate Feature Importances for tree-based models or Coefficients for Linear models
        importances = []
        coefficients = []
        
        # Get feature names from preprocessor
        num_cols = numeric_features
        # OneHotEncoder feature names
        cat_encoder = preprocessor.named_transformers_['cat']
        cat_cols = cat_encoder.get_feature_names_out(categorical_features).tolist()
        feature_names = num_cols + cat_cols
        
        if hasattr(model, 'feature_importances_'):
            imps = model.feature_importances_
            importances = [{"feature": fn, "importance": round(float(imp), 4)} for fn, imp in zip(feature_names, imps)]
            importances = sorted(importances, key=lambda x: x['importance'], reverse=True)
        elif hasattr(model, 'coef_'):
            # For multi-class, coef_ is shape (n_classes, n_features). 
            # We will average the absolute values to get a generic importance weight, 
            # OR we can just pick the first class to show positive/negative weight.
            # Averaging absolute weights is a good proxy for overall feature importance in multiclass LR.
            avg_coefs = np.mean(np.abs(model.coef_), axis=0)
            coefficients = [{"feature": fn, "coefficient": round(float(c), 4)} for fn, c in zip(feature_names, avg_coefs)]
            coefficients = sorted(coefficients, key=lambda x: x['coefficient'], reverse=True)
        
        metrics[name] = {
            "accuracy": round(acc, 4), 
            "precision": round(prec, 4), 
            "recall": round(rec, 4), 
            "f1": round(f1, 4),
            "confusion_matrix": cm,
            "classes": pipeline.classes_.tolist(),
            "feature_importances": importances,
            "coefficients": coefficients
        }
        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = name
            best_model = pipeline
            
    # Extract and save model representations
    try:
        reps = get_model_representations(trained_pipelines, numeric_features, categorical_features)
        with open('model_representations.json', 'w') as f:
            json.dump(reps, f, indent=4)
    except Exception as e:
        print(f"Warning: Could not save model representations: {e}")

    with open('metrics.json', 'w') as f:
        json.dump(metrics, f, indent=4)
    with open('model.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    with open('best_model_info.json', 'w') as f:
        json.dump({"best_model": best_model_name}, f)
        
    return best_model

def train_food_recommender(food_df):
    # Features for KNN: Region, Meal_Type, Diet_Type, Calories, Protein, Carbs, Fats
    # We will encode the categorical features
    cat_features = ['Region', 'Meal_Type', 'Diet_Type']
    num_features = ['Calories', 'Protein', 'Carbs', 'Fats']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(sparse_output=False, handle_unknown='ignore'), cat_features),
            ('num', StandardScaler(), num_features)
        ])
    
    X_food = preprocessor.fit_transform(food_df)
    
    knn = NearestNeighbors(n_neighbors=5, metric='cosine')
    knn.fit(X_food)
    
    # Save the pipeline and model
    with open('food_preprocessor.pkl', 'wb') as f:
        pickle.dump(preprocessor, f)
    with open('food_knn_model.pkl', 'wb') as f:
        pickle.dump(knn, f)

def train_models():
    print("Generating synthetic health data...")
    health_df = generate_health_data(10500)
    print("Training health classification models...")
    train_health_models(health_df)
    
    print("Loading Indian regional food dataset from CSV...")
    try:
        food_df = pd.read_csv('../dataset/indian_food_dataset.csv')
        print("Training KNN Food Recommender model...")
        train_food_recommender(food_df)
    except FileNotFoundError:
        print("Error: '../dataset/indian_food_dataset.csv' not found. Please provide the dataset to train the recommender.")
    
    print("All ML models trained and saved successfully.")

if __name__ == '__main__':
    train_models()
