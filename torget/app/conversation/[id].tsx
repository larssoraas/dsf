import { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMessages, useSendMessage, useRespondToOffer } from '@/hooks/useMessages';
import { useConversations } from '@/hooks/useConversations';
import { useAuthStore } from '@/store/auth';
import { OfferMessage } from '@/components/conversation/OfferMessage';
import type { Message } from '@/lib/types';

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleContainer, isOwn ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {message.type === 'offer' && message.offerAmount !== null && (
          <Text style={[styles.offerLabel, isOwn && styles.offerLabelOwn]}>
            Bud: {message.offerAmount.toLocaleString('nb-NO')} kr
          </Text>
        )}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
          {message.content}
        </Text>
        <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>{time}</Text>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { messages, isLoading, isError } = useMessages(id);
  const { mutate: send, isPending: isSending } = useSendMessage(id);
  const { mutate: respond } = useRespondToOffer(id);
  const { conversations } = useConversations();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Bid modal state
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');

  const myId = session?.user.id;
  const conversation = conversations.find((c) => c.id === id);
  const isSeller = Boolean(conversation && myId === conversation.sellerId);
  const isBuyer = Boolean(conversation && myId === conversation.buyerId);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  const handleSend = () => {
    const content = text.trim();
    if (!content || isSending) return;
    setText('');
    Keyboard.dismiss();
    send({ content, type: 'message' });
  };

  const handleSendBid = () => {
    const amount = parseInt(bidAmount.trim(), 10);
    if (!amount || amount <= 0) {
      Alert.alert('Ugyldig beløp', 'Skriv inn et beløp større enn 0');
      return;
    }
    setBidModalVisible(false);
    setBidAmount('');
    Keyboard.dismiss();
    send({ content: `Bud: ${amount.toLocaleString('nb-NO')} kr`, type: 'offer', offerAmount: amount });
  };

  const handleAccept = (msgId: string) => {
    respond({ msgId, action: 'accept' });
  };

  const handleDecline = (msgId: string) => {
    respond({ msgId, action: 'decline' });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Samtale', headerBackTitle: 'Tilbake' }} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}

        {isError && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Kunne ikke laste meldinger</Text>
          </View>
        )}

        {!isLoading && !isError && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const isOwn = item.senderId === myId;
              if (item.type === 'offer') {
                return (
                  <OfferMessage
                    message={item}
                    isMe={isOwn}
                    isSeller={isSeller}
                    onAccept={() => handleAccept(item.id)}
                    onDecline={() => handleDecline(item.id)}
                  />
                );
              }
              return <MessageBubble message={item} isOwn={isOwn} />;
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={styles.inputRow}>
          {isBuyer && (
            <TouchableOpacity
              style={styles.bidButton}
              onPress={() => setBidModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Legg inn bud"
            >
              <Text style={styles.bidButtonText}>Bud</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Skriv en melding…"
            placeholderTextColor="#9ca3af"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isSending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send melding"
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={bidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Legg inn bud</Text>
            <TextInput
              style={styles.modalInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder="Beløp i kr"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setBidModalVisible(false);
                  setBidAmount('');
                }}
              >
                <Text style={styles.modalCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSendButton]}
                onPress={handleSendBid}
              >
                <Text style={styles.modalSendText}>Send bud</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  messageList: {
    padding: 12,
    paddingBottom: 8,
  },
  bubbleContainer: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#3b82f6',
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  offerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  offerLabelOwn: {
    color: '#bfdbfe',
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
  },
  messageTextOwn: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    color: '#bfdbfe',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  bidButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
  },
  bidButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalSendButton: {
    backgroundColor: '#3b82f6',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  modalSendText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
