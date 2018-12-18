# gazetteer

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

had trouble connecting to sandbar until I found the rsa key in sandbar2_secrets.zip (did I make that? Dont recall...). Need to unzip the pair it and copy it (them) to 
`/Users/brian/.docker/machine/machines/sandbar2/`
I first tried `ssh-add` but as we know `ssh-add` and I do not get along

Copied test.db over to the host node here:
`docker-machine scp test.db sandbar2:/var/lib/docker/volumes/gnis-data/_data/test.db`







