export REPORT_FOLDER=reports/RAM8GB/AMB99_MMC120_PMB512KB_1secsTO/1org_endorsement_AssetQueriesTests

mkdir -p $REPORT_FOLDER

# npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/ledgerUpdateBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/ledgerUpdate.html

# npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/ledgerReadUpdateBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/ledgerReadUpdateBenchmark.html

npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/ledgerAssetsQueriesBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/ledgerAssetsQueriesBenchmark.html




