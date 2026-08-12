import cv2
import numpy as np
from PIL import Image

try:
    import mediapipe as mp
except Exception:
    mp = None


class PostureDetector:
    def __init__(self):
        self.mp_pose = None
        self.pose = None
        self.mp_drawing = None
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self.enabled = False

        if mp is not None and hasattr(mp, "solutions"):
            try:
                self.mp_pose = mp.solutions.pose
                self.pose = self.mp_pose.Pose(
                    static_image_mode=False,
                    model_complexity=1,
                    smooth_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.mp_drawing = mp.solutions.drawing_utils
                self.enabled = True
            except Exception:
                self.enabled = False

    def calculate_angle(self, a, b, c):
        """Calculate angle between three points in degrees."""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        return np.degrees(angle)

    def _fallback_detection(self, image):
        annotated_image = image.copy()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        if len(faces) == 0:
            return 62, ["⚠️ Face not clearly detected. Please stand centered and face the camera."], annotated_image, {
                "posture_score": 62,
                "symmetry_score": 62,
                "stability_score": 62,
                "shoulder_symmetry": 62.0,
                "neck_angle": 0.0,
                "head_tilt": 62.0,
                "spine_alignment": 62.0,
                "hip_alignment": 62.0,
                "knee_locking": 62.0,
                "body_balance": 62.0,
            }

        x, y, w, h = faces[0]
        face_center_x = x + (w / 2)
        face_center_y = y + (h / 2)
        mid_x = image.shape[1] / 2
        mid_y = image.shape[0] / 2

        shoulder_symmetry = max(0, min(100, 100 - abs(face_center_x - mid_x) * 0.25))
        head_tilt = max(0, min(100, 100 - abs(face_center_x - mid_x) * 0.25))
        body_balance = max(0, min(100, 100 - abs(face_center_y - mid_y) * 0.12))
        hip_alignment = max(0, min(100, 100 - abs(face_center_x - mid_x) * 0.15))
        knee_locking = max(0, min(100, 100 - abs((face_center_y - mid_y) * 0.08)))
        spine_alignment = max(0, min(100, 100 - abs(face_center_y - mid_y) * 0.18))

        posture_score = int(round((shoulder_symmetry + head_tilt + body_balance + hip_alignment + knee_locking + spine_alignment) / 6))
        stability_score = int(round((body_balance + hip_alignment + knee_locking) / 3))
        symmetry_score = int(round((shoulder_symmetry + head_tilt + hip_alignment) / 3))

        cv2.line(annotated_image, (int(mid_x), int(mid_y - 40)), (int(mid_x), int(mid_y + 120)), (0, 255, 255), 2)
        cv2.circle(annotated_image, (int(face_center_x), int(face_center_y)), 16, (0, 0, 255), 2)
        cv2.circle(annotated_image, (int(mid_x), int(mid_y + 35)), 12, (0, 255, 0), 2)

        feedback = [
            "🟡 Fallback posture mode is active because MediaPipe pose landmarks are unavailable in this environment.",
            "📌 Keep your face centered, shoulders relaxed, and stand tall with equal weight on both feet.",
            "✅ Try a consistent posture check to keep improving your pageant-ready alignment.",
        ]

        metrics = {
            "posture_score": posture_score,
            "symmetry_score": symmetry_score,
            "stability_score": stability_score,
            "shoulder_symmetry": round(shoulder_symmetry, 1),
            "neck_angle": 0.0,
            "head_tilt": round(head_tilt, 1),
            "spine_alignment": round(spine_alignment, 1),
            "hip_alignment": round(hip_alignment, 1),
            "knee_locking": round(knee_locking, 1),
            "body_balance": round(body_balance, 1),
        }
        return posture_score, feedback, annotated_image, metrics

    def detect_posture(self, image):
        """Detect posture from image and return a richer score breakdown."""
        if not self.enabled or self.pose is None or self.mp_drawing is None:
            return self._fallback_detection(image)

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)

        if not results.pose_landmarks:
            return 0, ["No pose detected. Please position yourself clearly in frame."], image, {}

        landmarks = results.pose_landmarks.landmark

        left_shoulder = [landmarks[11].x, landmarks[11].y]
        right_shoulder = [landmarks[12].x, landmarks[12].y]
        left_hip = [landmarks[23].x, landmarks[23].y]
        right_hip = [landmarks[24].x, landmarks[24].y]
        left_knee = [landmarks[25].x, landmarks[25].y]
        right_knee = [landmarks[26].x, landmarks[26].y]
        left_ankle = [landmarks[27].x, landmarks[27].y]
        right_ankle = [landmarks[28].x, landmarks[28].y]
        nose = [landmarks[0].x, landmarks[0].y]
        left_ear = [landmarks[13].x, landmarks[13].y]
        right_ear = [landmarks[14].x, landmarks[14].y]

        shoulder_symmetry = max(0, min(100, 100 - abs(left_shoulder[1] - right_shoulder[1]) * 600))
        hip_alignment = max(0, min(100, 100 - abs(left_hip[1] - right_hip[1]) * 600))
        neck_angle = self.calculate_angle(left_shoulder, nose, right_shoulder)
        head_tilt = max(0, min(100, 100 - abs(left_ear[1] - right_ear[1]) * 900))
        spine_alignment = self.calculate_angle(left_shoulder, left_hip, nose)
        body_balance = max(0, min(100, 100 - abs((left_shoulder[0] + right_shoulder[0]) / 2 - (left_hip[0] + right_hip[0]) / 2) * 400))

        left_knee_angle = self.calculate_angle(left_hip, left_knee, left_ankle)
        right_knee_angle = self.calculate_angle(right_hip, right_knee, right_ankle)
        knee_locking = max(0, min(100, 100 - abs(((left_knee_angle + right_knee_angle) / 2) - 173) * 6))

        neck_angle_score = max(0, min(100, 100 - abs(neck_angle - 180) * 2.5))
        spine_score = max(0, min(100, 100 - abs(spine_alignment - 180) * 2))
        stability_score = int(round((hip_alignment + body_balance + knee_locking) / 3))
        symmetry_score = int(round((shoulder_symmetry + hip_alignment + head_tilt) / 3))
        posture_score = int(round((neck_angle_score * 0.2) + (spine_score * 0.3) + (symmetry_score * 0.25) + (stability_score * 0.25)))

        feedback = []
        if shoulder_symmetry < 80:
            feedback.append("⚖️ Your left/right shoulders are uneven. Practice shoulder opening exercises.")
        else:
            feedback.append("✅ Shoulder symmetry looks balanced.")

        if neck_angle_score < 78:
            feedback.append("🦵 Your neck angle suggests forward head posture. Lengthen your neck and align your chin gently.")
        else:
            feedback.append("✅ Neck alignment is in a healthy range.")

        if head_tilt < 80:
            feedback.append("🧠 Head tilt is noticeable. Focus on keeping your gaze level and ears aligned over shoulders.")
        else:
            feedback.append("✅ Head tilt is controlled.")

        if spine_score < 82:
            feedback.append("📌 Spine alignment needs attention. Activate your core and stand tall through the crown of your head.")
        else:
            feedback.append("✅ Spine alignment is strong.")

        if hip_alignment < 80:
            feedback.append("🦴 Hip alignment is uneven. Shift weight evenly and keep your pelvis square.")
        else:
            feedback.append("✅ Hips are aligned.")

        if knee_locking < 78:
            feedback.append("🦵 Knees are over-locked or unstable. Soften the knees slightly and keep a grounded stance.")
        else:
            feedback.append("✅ Knee locking is controlled.")

        if body_balance < 80:
            feedback.append("⚖️ Body balance is slightly off. Practice a stable stance with deliberate weight distribution.")
        else:
            feedback.append("✅ Balance is steady.")

        annotated_image = image.copy()
        self.mp_drawing.draw_landmarks(
            annotated_image,
            results.pose_landmarks,
            self.mp_pose.POSE_CONNECTIONS,
            self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
            self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2),
        )

        for idx, score in [
            (11, shoulder_symmetry),
            (12, shoulder_symmetry),
            (23, hip_alignment),
            (24, hip_alignment),
            (25, knee_locking),
            (26, knee_locking),
            (0, head_tilt),
        ]:
            if score < 80:
                x, y = int(landmarks[idx].x * annotated_image.shape[1]), int(landmarks[idx].y * annotated_image.shape[0])
                cv2.circle(annotated_image, (x, y), 8, (0, 0, 255), -1)

        metrics = {
            "posture_score": posture_score,
            "symmetry_score": symmetry_score,
            "stability_score": stability_score,
            "shoulder_symmetry": round(shoulder_symmetry, 1),
            "neck_angle": round(neck_angle, 1),
            "head_tilt": round(head_tilt, 1),
            "spine_alignment": round(spine_score, 1),
            "hip_alignment": round(hip_alignment, 1),
            "knee_locking": round(knee_locking, 1),
            "body_balance": round(body_balance, 1),
        }

        return posture_score, feedback, annotated_image, metrics
