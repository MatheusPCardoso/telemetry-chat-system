#!/bin/bash
set -e

KEYFILE_PATH="/secret/keyfile"
FLAG_INIT="/data/db/.mongo_init_done"
USERNAME="chatbot"
PASSWORD="chatbot123"
REPLICA_SET_NAME="rs0"
HOSTNAME="mongodb"

if [ ! -f "$KEYFILE_PATH" ]; then
  echo "Gerando keyfile..."
  mkdir -p $(dirname "$KEYFILE_PATH")
  openssl rand -base64 756 > "$KEYFILE_PATH"
  chmod 400 "$KEYFILE_PATH"
fi

mongod --replSet "$REPLICA_SET_NAME" --bind_ip_all --keyFile "$KEYFILE_PATH" --fork --logpath /var/log/mongod.log

aguardar_mongo() {
  until mongosh --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; do
    echo "Aguardando inicialização do MongoDB..."
    sleep 2
  done
}

aguardar_primary() {
  echo "Aguardando eleição do primary..."
  until mongosh --eval "rs.isMaster().ismaster" | grep -q true; do
    sleep 1
  done
}

configurar_replica_set() {
  echo "Configurando replica set..."
  if ! mongosh admin --eval "rs.status().ok" > /dev/null 2>&1; then
    echo "Iniciando replica set..."
    mongosh --eval "rs.initiate({
      _id: '$REPLICA_SET_NAME',
      members: [ { _id: 0, host: '$HOSTNAME:27017' } ]
    })"
    aguardar_primary
  else
    echo "Replica set já configurado."
    aguardar_primary
  fi
}

criar_usuario_root() {
  echo "Criando usuário root..."
  mongosh admin --eval "db.createUser({
    user: '$USERNAME',
    pwd: '$PASSWORD',
    roles: [{ role: 'root', db: 'admin' }]
  })"
}

aguardar_mongo

if [ ! -f "$FLAG_INIT" ]; then
  configurar_replica_set
  criar_usuario_root
  touch "$FLAG_INIT"
else
  echo "Inicialização já realizada. Pulando configuração."
fi

mongod --shutdown

exec mongod --replSet "$REPLICA_SET_NAME" --bind_ip_all --keyFile "$KEYFILE_PATH" --auth
