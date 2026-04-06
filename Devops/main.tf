provider "aws" {
  region = "us-east-2"
}

# Security Group
resource "aws_security_group" "app_sg" {
  name        = "app-sg"
  description = "Allow HTTP and SSH"
  vpc_id      = "vpc-082fef65f03ddaaaf"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0" # Amazon Linux 2 (us-east-2)
  instance_type = "t3.micro"
  key_name      = "mykey"
  subnet_id     = "subnet-02339f4bd125f638a"

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name = "flask-app"
  }
}

# Target Group
resource "aws_lb_target_group" "tg" {
  name     = "app-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = "vpc-082fef65f03ddaaaf"

  health_check {
    path = "/health"
    port = "5000"
  }
}

# Attach EC2 to Target Group
resource "aws_lb_target_group_attachment" "tg_attach" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = aws_instance.app.id
  port             = 5000
}

# ALB
resource "aws_lb" "alb" {
  name               = "app-alb"
  load_balancer_type = "application"
  subnets = [
    "subnet-02339f4bd125f638a",
    "subnet-051f41536d7a5004d"
  ]

  security_groups = [aws_security_group.app_sg.id]
}

# Listener
resource "aws_lb_listener" "listener" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

output "alb_dns_name" {
  value = aws_lb.alb.dns_name
}

output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}
