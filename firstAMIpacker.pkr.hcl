variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "ami-0dfcb1ef8550277af"
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "vpc_id" {
  type    = string
  default = "vpc-06f1d36bce4e7d1db"
}

variable "subnet_id" {
  type    = string
  default = "subnet-068d54f5cd4a7c26b"
}

variable "profile" {
  type    = string
  default = "dev"
}

variable "aws_acregions" {
  type    = list(string)
  default = ["us-east-1", ]
}

variable "aws_accs" {
  type    = list(string)
  default = ["778516090662"]
}


packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.1"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "my-ami" {

  profile  = var.profile
  ami_name = "AWS_AMI-{{timestamp}}"


  instance_type = "t2.micro"
  source_ami    = var.source_ami
  region        = var.aws_region
  ssh_username  = var.ssh_username
  subnet_id     = var.subnet_id
  vpc_id        = var.vpc_id
  ami_regions   = var.aws_acregions
  ami_users     = var.aws_accs

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/xvda"
    volume_size           = 8
    volume_type           = "gp2"
  }
}

build {
  name    = "AMI build"
  sources = ["source.amazon-ebs.my-ami"]
  provisioner "file" {
    source      = "dist/webapp.zip"
    destination = "/home/ec2-user/webapp.zip"
  }
  provisioner "file" {
    source      = "webapp.service"
    destination = "/home/ec2-user/webapp.service"
  }
  provisioner "file" {
    source      = "agentConfig.json"
    destination = "/home/ec2-user/agentConfig.json"
  }
  provisioner "shell" {
    script = "shell.sh"
  }
}
