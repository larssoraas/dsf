import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Message } from '@/lib/types';

interface OfferMessageProps {
  message: Message;
  isMe: boolean;
  isSeller: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function OfferMessage({ message, isMe, isSeller, onAccept, onDecline }: OfferMessageProps) {
  const time = new Date(message.createdAt).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const showActions = isSeller && message.offerStatus === null;

  return (
    <View style={[styles.container, isMe ? styles.containerRight : styles.containerLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.offerLabel, isMe && styles.textOwn]}>
          Bud: {(message.offerAmount ?? 0).toLocaleString('nb-NO')} kr
        </Text>

        {message.offerStatus === 'accepted' && (
          <Text style={[styles.statusText, styles.statusAccepted]}>Akseptert</Text>
        )}

        {message.offerStatus === 'declined' && (
          <Text style={[styles.statusText, styles.statusDeclined]}>Avslatt</Text>
        )}

        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
              accessibilityRole="button"
              accessibilityLabel="Aksepter bud"
            >
              <Text style={styles.actionButtonText}>Aksepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
              accessibilityRole="button"
              accessibilityLabel="Avslå bud"
            >
              <Text style={[styles.actionButtonText, styles.declineButtonText]}>Avslå</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.timestamp, isMe && styles.timestampOwn]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  textOwn: {
    color: '#ffffff',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  statusAccepted: {
    color: '#16a34a',
  },
  statusDeclined: {
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  acceptButton: {
    backgroundColor: '#16a34a',
  },
  declineButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  declineButtonText: {
    color: '#374151',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    color: '#bfdbfe',
  },
});
