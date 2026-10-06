from models.task import Task
import json

data = {
    "id": "1",
    "name": "test",
    "type": "ui",
    "extra": {
        "_success_count": 1
    }
}
t = Task.from_dict(data)
d = t.to_dict()
print("1st pass:", json.dumps(d))

# mimic executor
t2 = Task.from_dict(d)
d2 = t2.to_dict()
print("2nd pass:", json.dumps(d2))

# mimic handler
task_dict = t2.to_dict()
task_dict["extra"]["_success_count"] = 2
t2.extra.update(task_dict["extra"])
d3 = t2.to_dict()
print("3rd pass:", json.dumps(d3))
