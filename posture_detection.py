import cv2
import numpy as np
from PIL import Image
import mediapipe as mp

class PostureDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        return np.degrees(angle)
    
    def detect_posture(self, image):
        """Detect posture from image and return score"""
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        posture_score = 0
        feedback = []
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Get key points
            left_shoulder = [landmarks[11].x, landmarks[11].y]
            right_shoulder = [landmarks[12].x, landmarks[12].y]
            left_hip = [landmarks[23].x, landmarks[23].y]
            right_hip = [landmarks[24].x, landmarks[24].y]
            head = [landmarks[0].x, landmarks[0].y]
            
            # Check spine alignment (neck to hip)
            left_spine_angle = self.calculate_angle(left_shoulder, left_hip, head)
            right_spine_angle = self.calculate_angle(right_shoulder, right_hip, head)
            
            # Check shoulder level
            shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
            
            # Check hip level
            hip_diff = abs(left_hip[1] - right_hip[1])
            
            # Calculate posture score (0-100)
            # Ideal spine angle is around 170-180 degrees
            spine_score = 100 - abs(175 - (left_spine_angle + right_spine_angle) / 2) / 1.75
            spine_score = max(0, min(100, spine_score))
            
            # Ideal alignment (shoulders and hips should be level)
            alignment_score = 100 - (shoulder_diff + hip_diff) * 500
            alignment_score = max(0, min(100, alignment_score))
            
            posture_score = int((spine_score + alignment_score) / 2)
            
            # Generate feedback
            if spine_score < 70:
                feedback.append("📌 Keep your spine straighter!")
            else:
                feedback.append("✅ Great spine alignment!")
            
            if shoulder_diff > 0.1:
                feedback.append("⚖️ Level your shoulders!")
            else:
                feedback.append("✅ Perfect shoulder alignment!")
            
            if hip_diff > 0.1:
                feedback.append("⚖️ Keep your hips level!")
            else:
                feedback.append("✅ Perfect hip alignment!")
            
            # Draw pose on image
            annotated_image = image.copy()
            self.mp_drawing.draw_landmarks(
                annotated_image,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
            )
            
            return posture_score, feedback, annotated_image
        
        return 0, ["No pose detected. Please position yourself clearly in frame."], image
