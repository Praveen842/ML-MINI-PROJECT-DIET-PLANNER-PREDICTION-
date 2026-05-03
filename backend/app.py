import os
import json
import pickle
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from train import train_models

app = Flask(__name__)
CORS(app)

# Global variables for food ML models to avoid reloading on every request
FOOD_DF = None
FOOD_PREPROCESSOR = None
FOOD_KNN_MODEL = None

def load_food_models():
    global FOOD_DF, FOOD_PREPROCESSOR, FOOD_KNN_MODEL
    try:
        if FOOD_DF is None:
            FOOD_DF = pd.read_csv('../dataset/indian_food_dataset.csv')
        if FOOD_PREPROCESSOR is None:
            with open('food_preprocessor.pkl', 'rb') as f:
                FOOD_PREPROCESSOR = pickle.load(f)
        if FOOD_KNN_MODEL is None:
            with open('food_knn_model.pkl', 'rb') as f:
                FOOD_KNN_MODEL = pickle.load(f)
    except Exception as e:
        print(f"Error loading food models: {e}")

def generate_timetable_ml(diet_type, duration, region):
    load_food_models()
    timetable = []
    
    # We will query the KNN model to find meals for Breakfast, Lunch, and Dinner
    # To query, we create a dummy record with desired features.
    # For calories, we set target calories depending on meal and diet type.
    
    if diet_type == 'Weight Loss':
        targets = {'Breakfast': (250, 10, 30, 5), 'Lunch': (350, 15, 40, 8), 'Dinner': (200, 10, 20, 5)}
    elif diet_type == 'Weight Gain':
        targets = {'Breakfast': (500, 15, 60, 15), 'Lunch': (700, 30, 80, 25), 'Dinner': (600, 25, 70, 20)}
    elif diet_type == 'Bodybuilding':
        targets = {'Breakfast': (400, 35, 30, 10), 'Lunch': (500, 50, 40, 15), 'Dinner': (450, 45, 20, 12)}
    elif diet_type == 'Health & Wellness':
        targets = {'Breakfast': (200, 5, 40, 5), 'Lunch': (300, 15, 35, 10), 'Dinner': (150, 8, 20, 5)}
    else: # Balanced
        targets = {'Breakfast': (350, 12, 45, 10), 'Lunch': (500, 20, 60, 15), 'Dinner': (400, 18, 50, 12)}
        
    for day in range(duration):
        day_plan = {"day": f"Day {day + 1}"}
        
        for meal in ['Breakfast', 'Lunch', 'Dinner']:
            c, p, cb, f = targets[meal]
            # Create a query point
            query_df = pd.DataFrame([{
                'Region': region,
                'Meal_Type': meal,
                'Diet_Type': diet_type,
                'Calories': c,
                'Protein': p,
                'Carbs': cb,
                'Fats': f
            }])
            
            try:
                X_query = FOOD_PREPROCESSOR.transform(query_df)
                # Fetch a very large number of neighbors to bypass the 30x noise duplicates per item
                distances, indices = FOOD_KNN_MODEL.kneighbors(X_query, n_neighbors=150)
                
                # Get unique foods by name to ensure daily variety
                neighbor_foods = FOOD_DF.iloc[indices[0]]
                unique_foods = neighbor_foods.drop_duplicates(subset=['Name'])
                
                if len(unique_foods) == 0:
                    raise Exception("No unique foods found")
                    
                # Cycle through the unique options based on the day
                chosen_idx = day % len(unique_foods)
                recommended_food = unique_foods.iloc[chosen_idx]
                
                day_plan[meal.lower()] = {
                    "name": recommended_food['Name'],
                    "calories": int(recommended_food['Calories']),
                    "protein": int(recommended_food['Protein']),
                    "carbs": int(recommended_food['Carbs']),
                    "fats": int(recommended_food['Fats'])
                }
            except Exception as e:
                # Fallback if model fails
                day_plan[meal.lower()] = {
                    "name": f"Healthy {region} {meal}",
                    "calories": c, "protein": p, "carbs": cb, "fats": f
                }
                
        timetable.append(day_plan)
        
    return timetable

@app.route('/train', methods=['POST'])
def train():
    try:
        train_models()
        return jsonify({"message": "Training completed successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    try:
        with open('metrics.json', 'r') as f:
            metrics = json.load(f)
        with open('best_model_info.json', 'r') as f:
            best_model_info = json.load(f)
            
        return jsonify({
            "metrics": metrics,
            "best_model": best_model_info["best_model"]
        }), 200
    except FileNotFoundError:
        return jsonify({"error": "Models not trained yet. Please call /train first."}), 404

@app.route('/model-representations', methods=['GET'])
def model_representations():
    try:
        with open('model_representations.json', 'r') as f:
            reps = json.load(f)
        # Also include KNN info
        if os.path.exists('food_knn_model.pkl'):
            import pickle
            with open('food_knn_model.pkl', 'rb') as f:
                knn = pickle.load(f)
            reps['KNN Food Recommender'] = {
                'model_name': 'KNN Food Recommender',
                'k': knn.n_neighbors,
                'metric': knn.metric,
                'algorithm': knn.algorithm,
                'description': 'Finds K nearest food items in nutritional space using Cosine Similarity.',
                'input_vector_example': {'Calories': 450, 'Protein': 40, 'Carbs': 30, 'Fats': 12}
            }
        return jsonify(reps), 200
    except FileNotFoundError:
        return jsonify({'error': 'model_representations.json not found. Please retrain models first.'}), 404

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # Check if model exists
        if not os.path.exists('model.pkl'):
            return jsonify({"error": "Model not trained yet."}), 400
            
        with open('model.pkl', 'rb') as f:
            model = pickle.load(f)
            
        try:
            # Extract features
            age = float(data.get('Age', 25))
            gender = data.get('Gender', 'Male')
            raw_height = float(data.get('Height', 170))
            height = raw_height / 100 if raw_height > 3 else raw_height # ensure meters
            weight = float(data.get('Weight', 70))
            activity_level = data.get('Activity Level', 'Medium')
            sleep_hours = float(data.get('Sleep Hours', 7))
            water_intake = float(data.get('Water Intake', 2.5))
            goal = data.get('Goal', 'Weight Loss')
            duration = int(data.get('Duration', 7))
            region = data.get('Region', 'North India')
        except ValueError:
            return jsonify({"error": "Invalid input data. Please ensure all numeric fields are filled correctly."}), 400
        
        bmi = weight / (height ** 2)
        
        input_data = pd.DataFrame([{
            'Age': age,
            'Gender': gender,
            'Height': height,
            'Weight': weight,
            'BMI': bmi,
            'Activity Level': activity_level,
            'Sleep Hours': sleep_hours,
            'Water Intake': water_intake,
            'Goal': goal
        }])
        
        # Predict
        predicted_diet = model.predict(input_data)[0]
        
        # Probability for confidence score
        if hasattr(model, 'predict_proba'):
            probs = model.predict_proba(input_data)[0]
            confidence = max(probs)
        else:
            confidence = 0.95 # Mock confidence if proba not available
            
        # Generate timetable using ML model
        timetable = generate_timetable_ml(predicted_diet, duration, region)
        
        return jsonify({
            "diet": predicted_diet,
            "duration": duration,
            "confidence": round(float(confidence), 2),
            "timetable": timetable
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
