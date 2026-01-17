from fastapi import FastAPI
from pymongo import MongoClient
from pydantic import BaseModel

app = FastAPI()

# MongoDB connection (replace with your connection string)
client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
collection = db["items"]

class Item(BaseModel):
    name: str
    description: str = None

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

@app.post("/items/")
def create_item(item: Item):
    item_dict = item.dict()
    result = collection.insert_one(item_dict)
    return {"id": str(result.inserted_id), **item_dict}

@app.get("/items/")
def read_items():
    items = list(collection.find({}, {"_id": 0}))
    return {"items": items}