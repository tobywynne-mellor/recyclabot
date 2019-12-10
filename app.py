from flask import Flask
from flask import request
from PIL import Image
import io
import requests
import json
import os
from collections import OrderedDict
import torch
from torch import nn #, optim
from torchvision import models, transforms #, datasets

app = Flask(__name__)

device = torch.device('cpu') # set to cuda if on GPU
model = models.vgg19()
classifier = nn.Sequential(OrderedDict([
    ('fc1', nn.Linear(25088, 4096)),
    ('relu', nn.ReLU()),
    ('fc2', nn.Linear(4096, 102)),
    ('output', nn.LogSoftmax(dim=1))
    ]))
model.classifier = classifier
model.load_state_dict(torch.load('./themodel.pth', map_location=device))
data_transforms = { 'validset': transforms.Compose([transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),}


@app.route('/send_image', methods=['GET', 'POST'])
def handleImage():
    params = request.get_json()
    url=params.get('url')
    download_image(url)
    result = cnn("./image.jpg")
    deleteImage()
    print("result: ", result)
    return result

def deleteImage():
    os.remove("./image.jpg")
    print("./image.jpg was deleted")

def download_image(url):
    image_file_path = "./image.jpg"
    r = requests.get(url)
    if r.status_code != requests.codes.ok:
        assert False, 'Status code error: {}.'.format(r.status_code)

    with Image.open(io.BytesIO(r.content)) as im:
        im.save(image_file_path)

    print('Image downloaded from url: {} and saved to: {}.'.format(url, image_file_path))

def cnn(image):
    return image_predictor(image)

def calc_accuracy(model, dataloaders, data, cuda=False):
    model.eval()
    material = []
    with torch.no_grad():
        for idx, (inputs, labels) in enumerate(dataloaders[data]):
            if cuda:
                inputs, labels = inputs, labels
                # obtain the outputs from the model
                outputs = model.forward(inputs)
                # max provides the (maximum probability, max value)
                _, predicted = outputs.max(dim=1)
                material.append(predicted)
                # check the
                if idx == 0:
                    #print(predicted) #the predicted class
                    #print(torch.exp(_)) # the predicted probability
                    equals = predicted == labels.data
                    #print(equals)
                    #print(equals.float().mean())
                    return material


def image_predictor(path,ground_truth=0):
    image = Image.open(path)
    imagetensor = data_transforms['validset'](image)
    dataset_single = torch.utils.data.TensorDataset(imagetensor[None], torch.tensor([ground_truth]))
    dataloader_valid_single = torch.utils.data.DataLoader(dataset_single, batch_size=1, shuffle = False)
    dataloader = {
            'train' : dataloader_valid_single,
            'valid' : dataloader_valid_single
            }
    value2 = calc_accuracy(model,dataloader,'valid',True)[0].item()
    return SingleNumToMaterial(value2)

def SingleNumToMaterial(value):
    if torch.tensor(value).item() == 0:
        return('cardboard')
    elif torch.tensor(value).item() == 1:
        return('glass')
    elif torch.tensor(value).item() == 2:
        return('metal')
    elif torch.tensor(value).item() == 3:
        return('paper')
    elif torch.tensor(value).item() == 4:
        return('plastic')





