import numpy as np
from sklearn.linear_model import LinearRegression

class ExamPredictor:
    def __init__(self):
        # We use a simple linear regression model for demo purposes.
        # In a real scenario, this would be trained on historical user study data.
        self.model = LinearRegression()
        
        # Dummy training data:
        # X = [[study_hours, past_score, focus_score_avg]]
        # Y = [predicted_exam_score_out_of_100]
        X = np.array([
            [10, 60, 80],
            [20, 70, 85],
            [30, 80, 90],
            [5, 50, 60],
            [50, 85, 95]
        ])
        y = np.array([65, 75, 88, 55, 98])
        
        self.model.fit(X, y)
        
    def predict_score(self, study_hours, past_score, focus_score_avg):
        """
        Predicts exam score based on study metrics.
        """
        input_data = np.array([[study_hours, past_score, focus_score_avg]])
        prediction = self.model.predict(input_data)
        
        # Clamp to 0-100
        score = max(0, min(100, prediction[0]))
        return round(score, 2)
        
    def predict_pass_probability(self, study_hours, past_score, focus_score_avg, passing_threshold=60):
        """
        Estimates the probability of passing.
        """
        predicted_score = self.predict_score(study_hours, past_score, focus_score_avg)
        
        # A simple sigmoid-like heuristic around the passing threshold
        # If predicted_score == threshold, prob is 50%.
        diff = predicted_score - passing_threshold
        prob = 1 / (1 + np.exp(-diff * 0.1)) # 0.1 is a smoothing factor
        
        return round(prob * 100, 2)

# Singleton instance
predictor_instance = ExamPredictor()
