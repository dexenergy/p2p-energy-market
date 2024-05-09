cd ../features/fixtures/
docker-compose -f docker-compose/docker-compose-tls.yaml -p node down --remove-orphans
docker volume prune --force