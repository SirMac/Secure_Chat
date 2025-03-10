from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('login/', views.loginUser, name='login'),
    path('register', views.registerUser, name='register'),
    path('deregister', views.deregisterUser, name='deregister'),
    path('logout', views.logoutUser, name='logout')
]