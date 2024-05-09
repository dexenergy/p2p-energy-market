export REPORT_FOLDER=reports/endorsing_experiment/RAM8GB/AMB99_MMC250_PMB1MB_1secsTO/3_org_endorsing

mkdir -p $REPORT_FOLDER

npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/ledgerUpdateBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/ledgerUpdate.html

npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/ledgerReadUpdateBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/ledgerReadUpdateBenchmark.html

npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/clearingMechanismBenchmark.yaml --caliper-flow-only-test --caliper-report-path $REPORT_FOLDER/clearingMechanismBenchmark.html
