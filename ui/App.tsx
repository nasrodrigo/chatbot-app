import React, { useEffect, useRef, useState } from 'react';
import { Alert, Appearance, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraMode, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { ChatAttachment, ChatDraft, ChatMessage } from './model/types';
import { runChatAgent } from './service/chatbot';

const themes = {
  light: { bg: '#F7F8FA', surface: '#FFFFFF', text: '#17181C', muted: '#777C86', border: '#E8E9ED', accent: '#5B5BD6', bubble: '#FFFFFF', input: '#FFFFFF' },
  dark: { bg: '#111216', surface: '#191A20', text: '#F4F4F6', muted: '#9A9DA7', border: '#303139', accent: '#8585FF', bubble: '#24252C', input: '#202127' },
};
type Theme = typeof themes.light;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatSize = (bytes?: number | null) => bytes == null ? '' : bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export default function App() {
  const systemDark = Appearance.getColorScheme() === 'dark';
  const [mode, setMode] = useState<'light' | 'dark'>(systemDark ? 'dark' : 'light');
  const theme = themes[mode];
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('picture');
  const [recordingVisible, setRecordingVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    return () => { if (recorderState.isRecording) void recorder.stop(); };
  }, [recorder, recorderState.isRecording]);

  const addAttachments = (items: ChatAttachment[]) => {
    setAttachments(current => {
      const seen = new Set(current.map(item => item.uri));
      return [...current, ...items.filter(item => !seen.has(item.uri))];
    });
  };

  const chooseLibrary = async () => {
    setMenuOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85 });
    if (result.canceled) return;
    addAttachments(result.assets.map(asset => ({ id: makeId(), kind: asset.type === 'video' ? 'video' : 'image', uri: asset.uri, name: asset.fileName || `Media ${result.assets.indexOf(asset) + 1}`, mimeType: asset.mimeType, size: asset.fileSize, durationMs: asset.duration ? asset.duration * 1000 : undefined, width: asset.width, height: asset.height, source: 'library', createdAt: new Date().toISOString() })));
  };

  const chooseFile = async () => {
    setMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (result.canceled) return;
    addAttachments(result.assets.map(asset => ({ id: makeId(), kind: 'file', uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size, source: 'file-picker', createdAt: new Date().toISOString() })));
  };

  const openCamera = async (modeValue: CameraMode) => {
    setMenuOpen(false);
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) return Alert.alert('Camera access needed', 'Enable camera access in Settings to use this feature.');
    if (modeValue === 'video') {
      const mic = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
      if (!mic.granted) return Alert.alert('Microphone access needed', 'Enable microphone access to record video.');
    }
    setCameraMode(modeValue);
    setCameraOpen(true);
  };

  const capture = async () => {
    try {
      if (!cameraRef.current) return;
      if (cameraMode === 'picture') {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        if (photo) addAttachments([{ id: makeId(), kind: 'image', uri: photo.uri, name: 'Camera photo.jpg', mimeType: 'image/jpeg', width: photo.width, height: photo.height, source: 'camera', createdAt: new Date().toISOString() }]);
      } else {
        if (isRecordingVideo) { cameraRef.current.stopRecording(); }
        else { setIsRecordingVideo(true); const video = await cameraRef.current.recordAsync({ maxDuration: 60 }); setIsRecordingVideo(false); if (video) addAttachments([{ id: makeId(), kind: 'video', uri: video.uri, name: 'Camera video.mp4', mimeType: 'video/mp4', source: 'video-recorder', createdAt: new Date().toISOString() }]); }
      }
      if (cameraMode === 'picture') setCameraOpen(false);
    } catch (error) {
      setIsRecordingVideo(false);
      Alert.alert('Could not use the camera', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const openAudioRecorder = async () => {
    setMenuOpen(false);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return Alert.alert('Microphone access needed', 'Enable microphone access in Settings to record audio.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setRecordingVisible(true);
  };

  const startAudio = async () => { await recorder.prepareToRecordAsync(); recorder.record(); };
  const finishAudio = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (uri) addAttachments([{ id: makeId(), kind: 'audio', uri, name: `Voice note ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.m4a`, mimeType: 'audio/m4a', durationMs: recorderState.durationMillis, source: 'audio-recorder', createdAt: new Date().toISOString() }]);
    setRecordingVisible(false);
  };

  const submit = async() => {
    const draft: ChatDraft = { text: text.trim(), attachments };
    if (!draft.text && !draft.attachments.length) return;
    setMessages(current => [...current, { id: makeId(), text: draft.text, attachments: draft.attachments, createdAt: new Date() }]);
    setText('');
    setAttachments([]);
    setSending(true);
    try {
      const response = await runChatAgent(draft, conversationId);
      setConversationId(response.conversationId);
      setMessages(current => [...current, response.assistantMessage]);
    } catch (error) {
      Alert.alert('Message could not be sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const styles = createStyles(theme);

  const renderAttachment = (item: ChatAttachment, removable = false) => (
    <View key={item.id} style={[styles.attachmentChip, removable && styles.draftChip]}>
      {item.kind === 'image' ? <Image source={{ uri: item.uri }} style={styles.thumb} /> : <Ionicons name={item.kind === 'video' ? 'videocam-outline' : item.kind === 'audio' ? 'mic-outline' : 'document-text-outline'} size={20} color={theme.accent} />}
      <View style={styles.attachmentCopy}><Text style={styles.attachmentName} numberOfLines={1}>{item.name}</Text>{item.size != null && <Text style={styles.attachmentMeta}>{formatSize(item.size)}</Text>}</View>
      {removable && <Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => setAttachments(items => items.filter(value => value.id !== item.id))}><Ionicons name="close" size={18} color={theme.muted} /></Pressable>}
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={styles.header}><View style={styles.brandMark}><Ionicons name="sparkles" size={19} color="#fff" /></View><View><Text style={styles.title}>Chat</Text><Text style={styles.subtitle}>Your assistant</Text></View><Pressable accessibilityLabel="Toggle color theme" hitSlop={10} onPress={() => setMode(current => current === 'light' ? 'dark' : 'light')} style={styles.themeButton}><Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={21} color={theme.text} /></Pressable></View>
        <FlatList<ChatMessage> data={messages} keyExtractor={item => item.id} contentContainerStyle={messages.length ? styles.messageList : styles.emptyList} ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={28} color={theme.accent} /></View><Text style={styles.emptyTitle}>Start a conversation</Text><Text style={styles.emptyText}>Ask a question or share an image, file, or voice note.</Text></View>} renderItem={({ item }: ListRenderItemInfo<ChatMessage>) => <View style={styles.message}><Text style={styles.messageText}>{item.text}</Text>{item.attachments.map((value: ChatAttachment) => renderAttachment(value))}<Text style={styles.time}>{formatTime(item.createdAt)}</Text></View>} />
        <View style={styles.composerArea}>
          {!!attachments.length && <View style={styles.draftTray}>{attachments.map(value => renderAttachment(value, true))}</View>}
          <View style={styles.composer}><Pressable accessibilityLabel="Add attachment" onPress={() => setMenuOpen(true)} style={styles.iconButton}><Ionicons name="add" size={25} color={theme.text} /></Pressable><TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={theme.muted} multiline maxLength={4000} style={styles.input} /><Pressable accessibilityLabel="Send message" disabled={sending || (!text.trim() && !attachments.length)} onPress={submit} style={[styles.sendButton, (sending || (!text.trim() && !attachments.length)) && styles.sendDisabled]}><Ionicons name={sending ? 'hourglass-outline' : 'arrow-up'} size={20} color="#fff" /></Pressable></View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Add to message</Text>
              {([['camera-outline', 'Take photo', () => openCamera('picture')], 
                ['videocam-outline', 'Record video', () => openCamera('video')], 
                ['images-outline', 'Choose photo or video', chooseLibrary], 
                ['document-outline', 'Choose file', chooseFile], 
                ['mic-outline', 'Record audio', openAudioRecorder]] as [string, string, () => void][]).map(([icon, label, action]) => 
                  <Pressable key={label} onPress={action} style={styles.sheetRow}>
                    <Ionicons name={icon as any} size={21} color={theme.text} />
                    <Text style={styles.sheetLabel}>{label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                  </Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => { setCameraOpen(false); setIsRecordingVideo(false); }}>
        {cameraOpen && <View style={styles.camera}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode={cameraMode} />
          <View style={styles.cameraControls}>
            <Pressable style={styles.cameraClose} onPress={() => { setCameraOpen(false); setIsRecordingVideo(false); }}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
            <Pressable onPress={capture} style={[styles.captureButton, isRecordingVideo && styles.captureActive]}>
              <View style={[styles.captureInner, isRecordingVideo && styles.captureInnerActive]} />
            </Pressable>
          </View>
        </View>}
      </Modal>
      <Modal visible={recordingVisible} transparent animationType="fade" onRequestClose={() => setRecordingVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.recordSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.recordPulse, recorderState.isRecording && styles.recordPulseActive]}>
              <Ionicons name="mic" size={28} color={recorderState.isRecording ? '#fff' : theme.accent} />
            </View>
              <Text style={styles.recordTitle}>{recorderState.isRecording ? 'Recording…' : 'Voice note'}</Text>
              <Text style={styles.recordTime}>{Math.floor(recorderState.durationMillis / 1000)}s</Text>
              <View style={styles.recordActions}>
                <Pressable style={[styles.recordButton, styles.cancelButton]} onPress={() => { void recorder.stop(); setRecordingVisible(false); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.recordButtonPrimary} onPress={recorderState.isRecording ? finishAudio : startAudio}>
                  <Text style={styles.recordButtonText}>{recorderState.isRecording ? 'Finish' : 'Record'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const createStyles = (t: Theme) => StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1 }, header: { height: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }, brandMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent }, title: { color: t.text, fontSize: 18, fontWeight: '700' }, subtitle: { color: t.muted, fontSize: 12, marginTop: 1 }, themeButton: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }, emptyList: { flexGrow: 1, justifyContent: 'center' }, empty: { alignItems: 'center', paddingHorizontal: 48 }, emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, emptyTitle: { color: t.text, fontSize: 20, fontWeight: '700' }, emptyText: { color: t.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }, messageList: { padding: 16, gap: 10 }, message: { alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: t.accent, borderRadius: 18, borderBottomRightRadius: 5, padding: 12 }, messageText: { color: '#fff', fontSize: 16, lineHeight: 22 }, time: { color: 'rgba(255,255,255,.72)', fontSize: 10, textAlign: 'right', marginTop: 6 }, composerArea: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, padding: 12, backgroundColor: t.bg }, draftTray: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }, composer: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: t.input, borderRadius: 27, padding: 7, borderWidth: 1, borderColor: t.border }, iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, input: { flex: 1, color: t.text, fontSize: 16, maxHeight: 110, paddingVertical: 9 }, sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: .35 }, attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: t.bubble, padding: 7, maxWidth: 220 }, draftChip: { borderWidth: 1, borderColor: t.border }, thumb: { width: 34, height: 34, borderRadius: 7 }, attachmentCopy: { flex: 1, minWidth: 0 }, attachmentName: { color: t.text, fontSize: 12, fontWeight: '600' }, attachmentMeta: { color: t.muted, fontSize: 10, marginTop: 2 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }, sheetTitle: { color: t.text, fontWeight: '700', fontSize: 17, marginBottom: 8 }, sheetRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14 }, sheetLabel: { flex: 1, color: t.text, fontSize: 16 }, camera: { flex: 1, backgroundColor: '#000' }, cameraControls: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 30 }, cameraClose: { position: 'absolute', top: 20, left: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center' }, captureButton: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' }, captureActive: { borderColor: '#ff5a5f' }, captureInnerActive: { backgroundColor: '#ff5a5f', borderRadius: 12, width: 34, height: 34 }, recordSheet: { margin: 20, marginBottom: 40, borderRadius: 24, alignItems: 'center', padding: 24 }, recordPulse: { width: 68, height: 68, borderRadius: 34, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }, recordPulseActive: { backgroundColor: '#E5484D' }, recordTitle: { color: t.text, fontSize: 18, fontWeight: '700', marginTop: 14 }, recordTime: { color: t.muted, marginTop: 4 }, recordActions: { flexDirection: 'row', gap: 12, marginTop: 22 }, recordButton: { height: 46, borderRadius: 23, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }, cancelButton: { backgroundColor: t.bg }, cancelText: { color: t.text, fontWeight: '600' }, recordButtonPrimary: { height: 46, borderRadius: 23, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent }, recordButtonText: { color: '#fff', fontWeight: '700' },
});
