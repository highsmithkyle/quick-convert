import tensorflowjs as tfjs
import tensorflow as tf

saved_model_path = "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/esrgan-tf2-tensorflow2-esrgan-tf2-v1"
output_path = "/Users/kyle/Desktop/FFMPEG_GIF_Slicer/model"

# Convert the TensorFlow SavedModel to TensorFlow.js format
tfjs.converters.convert_tf_saved_model(saved_model_path, output_path)

print(f"Model converted and saved to {output_path}")
