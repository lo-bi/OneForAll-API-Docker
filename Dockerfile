FROM python:3.8-alpine3.10

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk update && apk --no-cache add git build-base libffi-dev libxml2-dev libxslt-dev libressl-dev nodejs nodejs-npm npm
RUN git clone https://github.com/shmilylty/OneForAll.git
RUN git clone https://github.com/blechschmidt/massdns
WORKDIR /massdns
RUN make 
ADD . /OneForAll/
RUN mv /massdns/bin/massdns /OneForAll/thirdparty/massdns/massdns_linux_x86_64
WORKDIR /OneForAll
ADD requirements.txt /requirements.txt
RUN pip install uvloop
RUN pip install -r /requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

RUN mkdir /app
WORKDIR /app

ADD *.json /app/
RUN npm i

ADD *.js /app/

ENV ONEFORALLPATH='../OneForAll/'

ENTRYPOINT ["node", "index.js"]