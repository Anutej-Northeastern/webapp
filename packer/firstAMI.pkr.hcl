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

locals {
  ami_regions = {
    "us-east-1" = true
  }
}

source "amazon-ebs" "my-ami" {

  profile       = "dev"
  ami_name      = "AWS_AMI2"
  instance_type = "t2.micro"
  source_ami    = var.source_ami
  region        = var.aws_region
  ami_users     = ["778516090662"]
  #ami_regions = []


  //   source_ami_filter {
  //     filters = {
  //       name                = "Amazon linux 2"
  //       root-device-type    = "ebs"
  //       virtualization-type = "hvm"
  //     }
  //     most_recent = true
  //     owners      = ["amazon"]
  //   }

  ssh_username = var.ssh_username
  subnet_id    = var.subnet_id

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

  provisioner "shell" {
    script = "installation.sh"
  }
}