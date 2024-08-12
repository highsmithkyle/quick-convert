import kaggle

kaggle.api.authenticate()

datasets = kaggle.api.datasets_list()
print(f"Successfully authenticated. Number of datasets available: {len(datasets)}")
