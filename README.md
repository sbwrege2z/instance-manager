# AWS Instance Manager

This is a simple console application that allows you to view, start, stop, and reboot instances that are deployed in the AWS cloud.

The AWS Instance Manager is [available on Docker Hub](https://hub.docker.com/r/sbwrege2z/instance_manager).

## Usage

Since the container hosts a console application, it must be run as an interactive container with a dummy terminal attached:

```
docker run --interactive --tty sbwrege2z/instance-manager
```

or

```
docker run -it sbwrege2z/instance-manager
```

This won't get you very far, though. You must supply your AWS credentials to be able to see your instances in a selected regions. There are several ways to do this:

1. You can provide your AWS key and secret as environment variables:

```
docker run -it --env AWS_ACCESS_KEY_ID=<your_access_key_id> --env AWS_SECRET_ACCESS_KEY=<your_secret_access_key> sbwrege2z/instance-manager
```

2. You can mount the AWS credentials file into the container with read only privileges:

```
docker run -it -v /home/ec2-user/.aws:/root/.aws:ro sbwrege2z/instance-manager
```

3. You can enter the parameters into a config file and mount the file into the container:

```
docker run -it -v ~/data/instance-manager:/app/data sbwrege2z/instance-manager
```

Contents of the config file: 
```
[default]
accessKeyId=< YOUR ACCESS KEY ID>
secretAccessKey=< YOUR SECRET ACCESS KEY >

```

The benefit of the final method is that the regions displayed as choices are also pulled from this same configuration file, and if you mount a volume then your definitions will be saved between invocations of the container.  Otherwise the us regions will be displayed at start-up every time.

You can of course choose to do a combination of both if you have several profiles in your AWS credentials configuration and just want to store your region list in the config file:
```
docker run -it -v /home/ec2-user/.aws:/root/.aws:ro -v ~/data/instance-manager:/app/data sbwrege2z/instance-manager
```

### License

All files in this repository are licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

Attribution is required. Non-commercial use only.
