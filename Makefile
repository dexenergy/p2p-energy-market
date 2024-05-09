#
# Copyright 2020 IBM All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

base_dir := $(patsubst %/,%,$(dir $(realpath $(lastword $(MAKEFILE_LIST)))))


contracts_dir := $(base_dir)/contracts/basic
scenario_dir := $(base_dir)/features

# PEER_IMAGE_PULL is where to pull peer image from, it can be set by external env variable
# In fabric-gateway main branch it should reflect the location of the latest fabric main branch image
#PEER_IMAGE_PULL ?= hyperledger/fabric-peer:2.5
PEER_IMAGE_PULL ?= hyperledger-fabric.jfrog.io/fabric-peer:amd64-2.5-stable
# PEER_IMAGE_TAG is what to tag the pulled peer image as, it will also be used in docker-compose to reference the image
# In fabric-gateway main branch this version tag should correspond to the version in the forthcoming Fabric development
# branch.
export PEER_IMAGE_TAG ?= 2.5
export ORDERER_IMAGE_TAG ?= 2.5
export TOOLS_IMAGE_TAG ?= 2.5
export PEER_IMAGE_TAG ?= 2.5
export FABRIC_CA_IMAGE_TAG ?= latest
export DOCKER_DEBUG ?= info:dockercontroller,gateway=debug
export DOCKER_SOCK ?= /var/run/docker.sock
# TWO_DIGIT_VERSION specifies which chaincode images to pull, they will be tagged to be consistent with PEER_IMAGE_TAG
# In fabric-gateway main branch it should typically be the latest released chaincode version available in dockerhub.
TWO_DIGIT_VERSION ?= 2.5

export SOFTHSM2_CONF ?= $(base_dir)/softhsm2.conf
TMPDIR ?= /tmp

.PHONEY: setup-softhsm
setup-softhsm:
	mkdir -p "$(TMPDIR)/softhsm"
	echo "directories.tokendir = $(TMPDIR)/softhsm" > "$(SOFTHSM2_CONF)"
	softhsm2-util --init-token --slot 0 --label 'ForFabric' --pin 98765432 --so-pin 1234 || true

.PHONEY: default
default:
	@echo 'No default target.'

.PHONEY: build
build: build-contracts

.PHONEY: build-contracts
build-contracts:
	cd "$(contracts_dir)" && \
		npm install && \
		npm run build

.PHONEY: fabric-ca-client
fabric-ca-client:
	go install -tags pkcs11 github.com/hyperledger/fabric-ca/cmd/fabric-ca-client@latest	

.PHONEY: unit-test-contracts
unit-test-contracts: build-contracts
	cd "$(contracts_dir)" && \
		npm test

.PHONEY: scenario-test-contracts
scenario-test-contracts: fabric-ca-client setup-softhsm build-contracts
	cd "$(scenario_dir)/support" && \
		rm -rf package-lock.json node_modules && \
		npm install && \
		npm run test:contracts

.PHONEY: scenario-contracts
scenario-contracts:
	cd "$(scenario_dir)/support" && \
		npm install && \
		npm run test:contracts

.PHONEY: run-scenario
run-scenario:
	cd "$(scenario_dir)/support" && \
		npm run test:contracts

.PHONEY: scenario-test
scenario-test: scenario-test-contracts

.PHONEY: pull-latest-peer
pull-latest-peer:
	docker pull $(PEER_IMAGE_PULL)
	docker tag $(PEER_IMAGE_PULL) hyperledger/fabric-peer:$(PEER_IMAGE_TAG)
	docker pull hyperledger/fabric-baseos:$(PEER_IMAGE_TAG)
	docker tag hyperledger/fabric-baseos:$(PEER_IMAGE_TAG) hyperledger/fabric-baseos:$(PEER_IMAGE_TAG)
	# also need to retag the following images for the chaincode builder
	docker pull hyperledger/fabric-nodeenv:$(TWO_DIGIT_VERSION)
	docker tag hyperledger/fabric-nodeenv:$(TWO_DIGIT_VERSION) hyperledger/fabric-nodeenv:2.5

.PHONEY: clean-node
clean-node:
	rm -rf "$(contracts_dir)/package-lock.json" "$(contracts_dir)/node_modules"