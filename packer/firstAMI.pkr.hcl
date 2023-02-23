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

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.1"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "my-ami" {

  profile       = "dev"
  ami_name      = "AWS_AMI2"
  instance_type = "t2.micro"
  source_ami    = var.source_ami
  region        = var.aws_region
  ssh_username  = var.ssh_username
  subnet_id     = var.subnet_id
  vpc_id        = "${var.vpc_id}"
  ami_users     = ["778516090662"]
  ami_regions   = ["us-east-1", ]

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
    source      = "./packer/webapp.service"
    destination = "/home/ec2-user/webapp.service"
  }
  provisioner "shell" {
    script = "./packer/shell.sh"

  }
}
