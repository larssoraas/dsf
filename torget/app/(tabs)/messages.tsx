import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@/hooks/useConversations';
import { useAuthStore } from '@/store/auth';
import type { Conversation } from '@/lib/types';

function ConversationItem({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Samtale om ${conversation.listingTitle}`}
    >
      <View style={styles.itemContent}>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {conversation.listingTitle}
        </Text>
        <Text style={styles.otherParty} numberOfLines={1}>
          {conversation.otherPartyName ?? 'Ukjent bruker'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { conversations, isLoading, isError } = useConversations();

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Logg inn for å se meldinger</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Kunne ikke laste meldinger</Text>
        <Text style={styles.errorText}>Prøv igjen litt senere.</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Ingen samtaler ennå</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <ConversationItem
          conversation={item}
          onPress={() => router.push(`/conversation/${item.id}`)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  infoText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  list: {
    backgroundColor: '#ffffff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  itemContent: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  otherParty: {
    fontSize: 13,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 16,
  },
});
