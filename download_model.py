import kaggle
import os

# Set Kaggle API credentials
os.environ['KAGGLE_CONFIG_DIR'] = '/Users/kyle/.kaggle'

# Define the path to save the model
model_path = '/Users/kyle/Desktop/FFMPEG_GIF_Slicer/model'

# Create the directory if it doesn't exist
if not os.path.exists(model_path):
    os.makedirs(model_path)

# Authenticate using the Kaggle API
kaggle.api.authenticate()

# Correct dataset identifier
dataset_identifier = 'esrgan-tf2'

try:
    # Download the dataset
    kaggle.api.dataset_download_files(dataset_identifier, path=model_path, unzip=True)
    print("Model downloaded to:", model_path)
except kaggle.rest.ApiException as e:
    print(f"Exception when calling KaggleApi->dataset_download_files: {e}")
