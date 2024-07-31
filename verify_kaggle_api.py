import kaggle

# Authenticate using the Kaggle API
kaggle.api.authenticate()

# List datasets to verify the API key works
datasets = kaggle.api.datasets_list()
print(f"Successfully authenticated. Number of datasets available: {len(datasets)}")
