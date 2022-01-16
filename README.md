### Motivation

Have multiple projects with their own aliased scripts with colliding names.

Example directory structure:
```
~/projectA
    /scripts
        /app.sh # runs your docker-compose
        /check.py # runs quality tools in python
        /yarn.sh # runs yarn on amd64 node 16 via docker
~/projectB
    /dev-tools
        /scripts
            /app.sh
            /build.js # builds your code
            /yarn.sh # runs yarn on arm node 14 via docker
```

The goal is to call those scripts easily with an alias. Unfortunately, alias are global.

### Solution

A very short alias that acts as a hub for your project's scripts, depending on where you are. 

For example `sc app up -d` will call `~/projectA/scripts/app.sh up -d` if you are somewhere inside projectA, or `~/projectB/dev-tools/scripts/app.sh up -d` if you are inside projectB.

This works even if you are deeper within the project's structure, so scripts like `sc yarn` still work from any workspace you might have.

### Installation

- Node must be installed
- Clone/download this repository anywhere you like
- Create one entry in your .bashrc to register the alias

```bash
git clone git@github.com:uncaught/script-completion.git ~/script-completion
echo "source ~/script-completion/register" >> ~/.bashrc
```

### Configuration

Create a `.sc.json` file in each of your projects and add a `scriptDirs`-array to it, pointing relative to the script directories of that project.

```json
{
    "scriptDirs": [
        "./scripts"
    ]
}
```

### Bash Completion

The alias `sc` will provide completion for every script name it finds. 

Inheriting completion from those scripts is not supported, yet. However, you can define completion manually in the config.

Lets say the `build.js` script has an option `--watch` and an argument, either `prod` or `dev`, then this would give you completion for those:

```json
{
    "completion": {
        "build": {
            "--watch": {
                "prod": {},
                "dev": {}
            },
            "prod": {},
            "dev": {}
        }
    }
}
```

A special plugin exists to provide completion for docker-compose. Lets say the `app.sh` is your docker-compose short cut, then configure the location of the docker-compose.yml so that the script can complete your service names:

```json
{
    "completion": {
        "app": {
            "$$docker-compose": {
                "file": "./docker-compose.yml"
            }
        }
    }
}
```


### Renaming the alias and/or config

The alias `sc` as well as the name of the config file `.sc.json` can be changed. You only need to change line in your `~/.bashrc`, adding two arguments for the alias and the file name respectively:

```bash
source ~/script-completion/register my my.json
```
