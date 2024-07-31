FROM tensorflow/tensorflow:latest

RUN apt-get update && apt-get install -y \
    python3-pip

RUN pip3 install tensorflowjs

WORKDIR /app

COPY esrgan-tf2-tensorflow2-esrgan-tf2-v1 /app/esrgan-tf2-tensorflow2-esrgan-tf2-v1

CMD ["tensorflowjs_converter", "--input_format=tf_saved_model", "--output_format=tfjs_graph_model", "--signature_name=serving_default", "--saved_model_tags=serve", "/app/esrgan-tf2-tensorflow2-esrgan-tf2-v1", "/app/model"]
