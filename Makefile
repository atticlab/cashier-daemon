ARGS = $(filter-out $@,$(MAKECMDGOALS))
MAKEFLAGS += --silent
CONTAINERS = $(shell docker ps -a -q)
VOLUMES = $(shell docker volume ls |awk 'NR>1 {print $2}')
list:
	sh -c "echo; $(MAKE) -p no_targets__ | awk -F':' '/^[a-zA-Z0-9][^\$$#\/\\t=]*:([^=]|$$)/ {split(\$$1,A,/ /);for(i in A)print A[i]}' | grep -v '__\$$' | grep -v 'Makefile'| sort"

stop:
	docker stop smartmoney-cashier-node
	docker rm smartmoney-cashier-node

build:
	@if [ ! -f ./.env ]; then\
	  	read -p "Enter master public key:" master_key; echo "MASTER_KEY=$$master_key" >> ./.env; \
	  	read -p "Enter horizon host (with protocol and port [optional]):" horizon_host; echo "HORIZON_HOST=$$horizon_host" >> ./.env; \
	fi
	docker build -t smartmoney/cashier_node .
	docker run --env-file ./.env --restart=always -it -p 5051:5051 --name smartmoney-cashier-node smartmoney/cashier_node