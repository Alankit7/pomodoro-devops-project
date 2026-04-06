#  Pomodoro DevOps Project

## Overview
A full-stack Pomodoro timer deployed on AWS using Terraform.

##  Tech Stack
- Frontend: React (Vite)
- Backend: Flask
- Infrastructure: Terraform
- Cloud: AWS (EC2, ALB)

##  Architecture
User → ALB → EC2 → Flask App

##  Features
- Pomodoro timer UI
- Load-balanced backend
- Infrastructure as Code

##  How to Run

### Deploy
```bash
terraform init
terraform apply
