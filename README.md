# gazetteer

- Install the [Docker daemon](https://www.docker.com/get-started) of your choice 
- Copy the secrets (not checked in here) in your local machine:
  -- i.e.: /Users/brian/.docker/machine/machines/sandbar2/<secrets>
- Build an image onto the remote machine
  -- *one way* to do it: (thias builds on the remote machine)
  `eval $(docker-machine env sandbar2)` (loads the remote machine profile)
  `docker image build -t gazetteer:b60 .` (builds *on to* the remote machine)
  `docker stack deploy -c docker-compose.yml gazetteer-svc` (set proper build in .yml file. TODO: get the build into an env var)






