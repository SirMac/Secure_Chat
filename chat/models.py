from django.db import models
from django.utils import timezone


class Room(models.Model):
    room_name = models.CharField(max_length=50)
    description = models.CharField(max_length=200)
    capacity = models.CharField(max_length=200)
    status = models.CharField(max_length=50)
    createdat = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.room_name


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    sender = models.CharField(max_length=50)
    receiver = models.CharField(max_length=50)
    message = models.TextField()
    createdat = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{str(self.room)} - {self.sender}"


class SystemUsers(models.Model):
    username = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    createdat = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{str(self.room)} - {self.sender}"


class Cryptokey(models.Model):
    sender = models.CharField(max_length=50)
    privateKey = models.TextField()
    publicKey = models.TextField()
    key1 = models.TextField()
    key2 = models.TextField()
    key3 = models.TextField()
    createdat = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{str(self.sender)} - {self.createdat}"