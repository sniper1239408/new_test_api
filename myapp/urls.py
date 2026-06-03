from rest_framework.routers import DefaultRouter
from . import views
from django.urls import path

router = DefaultRouter()
router.register(r"books", views.BookViewSet, basename="book")
router.register(r"groups", views.GroupViewSet)
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"category-assignments", views.CategoryManagerAssignmentViewSet, basename="category-assignment")

urlpatterns = [
    path('login/', views.LoginView.as_view()),
    path('canAccessAdmin/', views.AdminView.as_view()),
    path('users/', views.UserListView.as_view()),
    path('users/<int:pk>/', views.UserDetailView.as_view()),  # /api/users/1/
] + router.urls
