# gazetteer

For **local** testing of new data, update test.db in the /data-loader folder of this project.
- Use `npm install` on a new (or cleaned) repo to get all the many goodies we are using
- Use `npm start` to launch the project locally. This will use nodemon to launch node (restarts on file changes) and will set the proper location for db data (see the [package.json](https://github.com/bradxn/gazetteer/blob/master/package.json) file's `start` script to see the mojo in action )

## The Container Goop(tm) or deployment to production (not needed for local dev work)
- Install the [Docker daemon](https://www.docker.com/get-started) of your choice 
- Copy the secrets (not checked in here of course) in your local machine:
  -- i.e.: /Users/brian/.docker/machine/machines/sandbar2/<secrets>
- Build an image onto the remote machine
  - *one way* to do it: (this builds on the remote machine)
  - `eval $(docker-machine env sandbar2)` (loads the remote machine profile into your bash session)
  - `docker image build -t gazetteer:b60 .` (builds *on to* the remote machine. `b60` is the build in this example, so change it accordingly until I script that out )
  - `docker stack deploy -c docker-compose.yml gazetteer-svc` (set proper build in .yml file. Yep, its a TODO to get the build into an env var)
  - `eval $(docker-machine env -u` cleans up your bash session to get back to your local docker ocntext






