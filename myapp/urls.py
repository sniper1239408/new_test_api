from rest_framework.routers import DefaultRouter
from . import views
from django.urls import path

router = DefaultRouter()
router.register(r'books', views.BookViewSet, basename='book')
router.register(r'groups', views.GroupViewSet)

urlpatterns = [
    path('login/', views.LoginView.as_view()),
    path('canAccessAdmin/', views.AdminView.as_view()),
    path('users/', views.UserListView.as_view())
] + router.urls
