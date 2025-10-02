#!/bin/bash

# PROMPT 21: n8n & WHATSAPP OPTIMIZATION - WORKFLOW OPTIMIZATION SCRIPT
# Analyzes and optimizes n8n workflows

echo "==================================================="
echo "GIM_AI - n8n Workflow Optimization"
echo "==================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories
WORKFLOWS_DIR="${N8N_WORKFLOWS_DIR:-./n8n-workflows}"
BACKUP_DIR="${N8N_BACKUP_DIR:-./n8n-workflows/backups}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ============================================
# ANALYZE WORKFLOW
# ============================================

analyze_workflow() {
  local workflow_file=$1
  local workflow_name=$(basename "$workflow_file" .json)
  
  echo -e "${BLUE}Analyzing:${NC} $workflow_name"
  
  # Count nodes
  local node_count=$(jq '.nodes | length' "$workflow_file" 2>/dev/null || echo 0)
  echo "  Nodes: $node_count"
  
  # Check for error handling
  local error_handlers=$(jq '.nodes | map(select(.name | ascii_downcase | contains("error"))) | length' "$workflow_file" 2>/dev/null || echo 0)
  if [ "$error_handlers" -eq 0 ]; then
    echo -e "  ${YELLOW}⚠️  No error handling detected${NC}"
  else
    echo -e "  ${GREEN}✅ Error handling: $error_handlers nodes${NC}"
  fi
  
  # Check for webhooks
  local webhooks=$(jq '.nodes | map(select(.type == "n8n-nodes-base.webhook")) | length' "$workflow_file" 2>/dev/null || echo 0)
  if [ "$webhooks" -gt 0 ]; then
    echo "  Webhooks: $webhooks"
    
    # Check webhook authentication
    local insecure_webhooks=$(jq '.nodes | map(select(.type == "n8n-nodes-base.webhook" and (.parameters.authentication | not))) | length' "$workflow_file" 2>/dev/null || echo 0)
    if [ "$insecure_webhooks" -gt 0 ]; then
      echo -e "  ${RED}❌ Insecure webhooks: $insecure_webhooks${NC}"
    fi
  fi
  
  # Check for wait nodes
  local wait_nodes=$(jq '.nodes | map(select(.type == "n8n-nodes-base.wait")) | length' "$workflow_file" 2>/dev/null || echo 0)
  if [ "$wait_nodes" -gt 3 ]; then
    echo -e "  ${YELLOW}⚠️  Many wait nodes: $wait_nodes${NC}"
  fi
  
  # Check for function nodes with loops
  local function_nodes=$(jq '.nodes | map(select(.type == "n8n-nodes-base.function" or .type == "n8n-nodes-base.code")) | length' "$workflow_file" 2>/dev/null || echo 0)
  if [ "$function_nodes" -gt 0 ]; then
    echo "  Function nodes: $function_nodes"
  fi
  
  echo ""
}

# ============================================
# OPTIMIZE WORKFLOW
# ============================================

optimize_workflow() {
  local workflow_file=$1
  local workflow_name=$(basename "$workflow_file" .json)
  local backup_file="$BACKUP_DIR/${workflow_name}_$(date +%Y%m%d_%H%M%S).json"
  
  echo -e "${BLUE}Optimizing:${NC} $workflow_name"
  
  # Create backup
  cp "$workflow_file" "$backup_file"
  echo "  Backup: $backup_file"
  
  # Read workflow
  local workflow=$(cat "$workflow_file")
  
  # Add execution settings if missing
  local has_settings=$(echo "$workflow" | jq 'has("settings")' 2>/dev/null)
  
  if [ "$has_settings" = "false" ]; then
    echo "  Adding execution settings..."
    workflow=$(echo "$workflow" | jq '. + {settings: {executionOrder: "v1", executionTimeout: 300}}')
    echo "$workflow" > "$workflow_file"
    echo -e "  ${GREEN}✅ Optimized${NC}"
  else
    # Update existing settings
    local needs_update=false
    
    if [ "$(echo "$workflow" | jq '.settings.executionOrder' 2>/dev/null)" = "null" ]; then
      workflow=$(echo "$workflow" | jq '.settings.executionOrder = "v1"')
      needs_update=true
    fi
    
    if [ "$(echo "$workflow" | jq '.settings.executionTimeout' 2>/dev/null)" = "null" ]; then
      workflow=$(echo "$workflow" | jq '.settings.executionTimeout = 300')
      needs_update=true
    fi
    
    if [ "$needs_update" = true ]; then
      echo "$workflow" > "$workflow_file"
      echo -e "  ${GREEN}✅ Settings updated${NC}"
    else
      echo "  Already optimized"
    fi
  fi
  
  echo ""
}

# ============================================
# MAIN EXECUTION
# ============================================

echo "Searching for workflows in: $WORKFLOWS_DIR"
echo ""

# Find all workflow JSON files
WORKFLOW_FILES=$(find "$WORKFLOWS_DIR" -name "*.json" -not -name "*.backup.json" 2>/dev/null)

if [ -z "$WORKFLOW_FILES" ]; then
  echo -e "${YELLOW}No workflow files found${NC}"
  exit 0
fi

TOTAL_FILES=$(echo "$WORKFLOW_FILES" | wc -l)
echo "Found $TOTAL_FILES workflow(s)"
echo ""

# ============================================
# ANALYSIS PHASE
# ============================================

echo "==================================================="
echo "ANALYSIS PHASE"
echo "==================================================="
echo ""

for workflow_file in $WORKFLOW_FILES; do
  analyze_workflow "$workflow_file"
done

# ============================================
# OPTIMIZATION PHASE
# ============================================

echo "==================================================="
echo "OPTIMIZATION PHASE"
echo "==================================================="
echo ""

read -p "Proceed with optimization? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for workflow_file in $WORKFLOW_FILES; do
    optimize_workflow "$workflow_file"
  done
  
  echo ""
  echo -e "${GREEN}✅ Optimization complete${NC}"
  echo "Backups saved to: $BACKUP_DIR"
else
  echo "Optimization cancelled"
fi

echo ""
echo "==================================================="
echo "RECOMMENDATIONS"
echo "==================================================="
echo ""
echo "1. Test workflows in n8n UI after optimization"
echo "2. Monitor execution times and error rates"
echo "3. Consider splitting complex workflows (> 20 nodes)"
echo "4. Add error handling to all critical workflows"
echo "5. Secure all webhook endpoints with authentication"
echo ""
