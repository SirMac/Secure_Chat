from django.urls import path
from .views import index, chatRoom, getChat

app_name = 'chat'

urlpatterns = [
    path("<str:username>/", index, name="index"),
    path("chat/<str:username>/", chatRoom, name="chatRoom"),
    path("chats/<str:groupname>/", getChat, name="getChat"),
]
