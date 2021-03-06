
The data-loader container is only needed to facilitate the delivery of the gnis data to a Mac based Docker. Linux simply maps to the filesystem as you'd expect and you can do what you like with the bits. On the Mac daemon you have to be able to get to the VM which is tucked away somewhere and I haven't yet figured out how to access it by name to remote. Most frustratingly, it does not sem to participate in the docker-machine process so I can't manage it or scp into it either.

I'm missing a few key pieces of info here and I expect this to become much more straightforward in the future, but for now this is a workaround to get to the filesystem of the VM that hosts Docker on a Mac.


Do all this in the context of your local Mac (i.e. make certain that )
Build the image
`docker image build -t gnis-data-loader .`

Run it attaching the pre-created (via:  docker volume create --name gnis-data) volume 'gnis-data'
`docker run -it --rm -v gnis-data:/gnis-data gazetteer-data`

This leads to a bash prompt in the container. From here type in (proofread paths):
`cp /local-gnis-data/test.db /gnis-data/test.db`

Then `exit` bash to exit the container and clean up after itself (since we passed in --rm to run it)

You can validate that the data file is on the filesystem of your local "host VM" on the Mac by using this dark mojo that in essnece lets you create a container that is logged in to the VM's namespace:
`docker run --rm --privileged --pid=host -it alpine:3.8 nsenter -t 1 -m -u -n -i sh`
(see 'man nsenter' on a linux box or the interwebs)

You'll see the data in the local path:
`/var/lib/docker/volumes/gnis-data/_data`

########### Random notes actaully, don't README

Ran in the context of our running node to create the gnis-data volume on the host
`docker volume create --name gnis-data` 

Prove it with:
`docker volume inspect gnis-data`
[
    {
        "CreatedAt": "2018-12-15T15:50:43Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/gnis-data/_data",
        "Name": "gnis-data",
        "Options": {},
        "Scope": "local"
    }
]

had trouble connecting (ssh) to sandbar2 until I found the rsa key in sandbar2_secrets.zip (did I make that? Dont recall...). Need to unzip the pair it and copy it (them) to 
`/Users/brian/.docker/machine/machines/sandbar2/`
I first tried `ssh-add` but as we know `ssh-add` and I do not get along

Copied test.db over to the host node here:
`docker-machine scp test.db sandbar2:/var/lib/docker/volumes/gnis-data/_data/test.db`
