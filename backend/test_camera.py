import cv2

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Impossible d'ouvrir la caméra")
else:
    print("✅ Caméra détectée")
    ret, frame = cap.read()
    print("✅ Frame lue" if ret else "❌ Impossible de lire une frame")
    cap.release()
    cv2.destroyAllWindows()
