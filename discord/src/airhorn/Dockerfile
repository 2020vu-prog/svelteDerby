FROM golang:latest
run mkdir airhorn
copy main.go ./airhorn
copy build.sh ./airhorn
run cd ./airhorn && ./build.sh
copy *.ORIG ./airhorn
