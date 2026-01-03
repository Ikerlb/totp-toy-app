#!/bin/bash
set -e

npm run build
aws s3 sync dist/ s3://lissarrague.xyz/toy-totp/ --delete

# Invalidate CloudFront cache
distribution_id=$(aws cloudfront list-distributions | jq -r '.DistributionList.Items[0].Id')
aws cloudfront create-invalidation --distribution-id $distribution_id --paths="/toy-totp/*"
