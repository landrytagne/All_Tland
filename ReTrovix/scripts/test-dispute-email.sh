#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Test: File a dispute → Check MailHog for email
# ═══════════════════════════════════════════════════════════════

API="http://localhost:8080"
MAILHOG="http://localhost:8025/api/v2/messages"

echo "═══════════════════════════════════════════════════════════════"
echo "  📧 Test: Dispute email → MailHog"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Login as user (amine@example.com)
echo "1️⃣  Logging in as amine@example.com..."
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"amine@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo $LOGIN
  exit 1
fi
echo "   ✅ Token obtained"

# Step 2: Login as second user (sophie@example.com) for the other party
echo "2️⃣  Logging in as sophie@example.com..."
LOGIN2=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"sophie@example.com","password":"password123"}')

TOKEN2=$(echo $LOGIN2 | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN2" ]; then
  echo "❌ Login2 failed"
  exit 1
fi
echo "   ✅ Token2 obtained"

# Step 3: Initiate a return request (Amine is finder, Sophie is loser)
echo "3️⃣  Initiating return request..."
RETURN=$(curl -s -X POST "$API/api/returns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"loserId":6,"foundObjectId":null,"lostObjectId":null}')

RETURN_ID=$(echo $RETURN | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$RETURN_ID" ]; then
  echo "❌ Failed to create return request. Response:"
  echo $RETURN
  exit 1
fi
echo "   ✅ Return request created: ID=$RETURN_ID"

# Step 4: Sophie proposes reward
echo "4️⃣  Sophie proposes reward (25,000 XAF)..."
curl -s -X POST "$API/api/returns/$RETURN_ID/propose-reward" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"amount":25000}' > /dev/null
echo "   ✅ Reward proposed"

# Step 5: Amine accepts reward
echo "5️⃣  Amine accepts reward..."
curl -s -X POST "$API/api/returns/$RETURN_ID/accept-reward" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":25000}' > /dev/null
echo "   ✅ Reward accepted"

# Step 6: Both validate
echo "6️⃣  Both parties validate..."
curl -s -X POST "$API/api/returns/$RETURN_ID/validate" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X POST "$API/api/returns/$RETURN_ID/validate" \
  -H "Authorization: Bearer $TOKEN2" > /dev/null
echo "   ✅ Both validated"

# Step 7: Set appointment
echo "7️⃣  Setting appointment..."
curl -s -X POST "$API/api/returns/$RETURN_ID/set-appointment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"meetingDate":"2026-08-25T14:00:00","meetingLocation":"Carrefour Warda, Douala"}' > /dev/null
echo "   ✅ Appointment set"

# Step 8: Sophie files a dispute
echo "8️⃣  Sophie files a dispute..."
DISPUTE=$(curl -s -X POST "$API/api/returns/$RETURN_ID/dispute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"reason":"LObjet remis nest pas le bon. Il y a une difference de couleur et de taille."}')
echo "   ✅ Dispute filed"

# Step 9: Check MailHog for emails
echo ""
echo "9️⃣  Checking MailHog for dispute emails..."
sleep 2
MSGS=$(curl -s "$MAILHOG")
TOTAL=$(echo $MSGS | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   📧 Total emails in MailHog: $TOTAL"

# Show email subjects
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📬 Emails captured:"
echo "═══════════════════════════════════════════════════════════════"
echo $MSGS | grep -o '"Subject":{[^}]*}' | while read -r line; do
  SUBJECT=$(echo $line | grep -o '"raw":"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$SUBJECT" ]; then
    echo "  📨 $SUBJECT"
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🌐 Open MailHog Web UI to see full emails:"
echo "     http://localhost:8025"
echo "═══════════════════════════════════════════════════════════════"
