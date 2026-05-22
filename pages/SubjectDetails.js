import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  BackHandler,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Pdf from 'react-native-pdf';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tts from 'react-native-tts';
import {loadPdfPageTexts} from '../utils/pdfTextExtractor';

const NOTES_KEY_PREFIX = '@grade9_subject_notes/v1/';
const TTS_CHUNK_SIZE = 3500;
const PDF_MIN_SCALE = 1;
const PDF_MAX_SCALE = 4;
const PDF_SCALE_STEP = 0.25;

const PdfViewer = React.memo(
  function PdfViewer({source, onLoadComplete, onPageChanged, onScaleChanged, pdfRef}) {
    return (
      <Pdf
        ref={pdfRef}
        source={source}
        style={pdfViewerStyle}
        minScale={PDF_MIN_SCALE}
        maxScale={PDF_MAX_SCALE}
        onLoadComplete={onLoadComplete}
        onPageChanged={onPageChanged}
        onScaleChanged={onScaleChanged}
      />
    );
  },
  (prev, next) => prev.sourceUri === next.sourceUri,
);



// the book reader
const pdfViewerStyle = {
  flex: 1,
  width: Dimensions.get('window').width,
};

export default class SubjectDetails extends Component {
  constructor(props) {
    super(props);
    this.handleBackButtonClick = this.handleBackButtonClick.bind(this);
    this.state = {
      filepath: this.props.route?.params?.filepath,
      notes: [],
      draftNote: '',
      activeTab: 'pdf',
      editingNoteId: null,
      editDraft: '',
      ttsReady: false,
      isSpeaking: false,
      readingSource: null,
      readingNoteId: null,
      readingAll: false,
      pdfPageTexts: [],
      pdfTotalPages: 0,
      pdfCurrentPage: 1,
      pdfTextLoading: false,
      pdfTextReady: false,
      pdfTextError: null,
      pdfSpeakingPage: null,
      pdfReadingAll: false,
    };
    this.pdfScale = 1;
    this.pdfRef = null;
    this.pdfSource = null;
    this.pdfSourceUri = null;
    this.ttsQueue = [];
    this.ttsQueueIndex = 0;
    this.ttsChunkIndex = 0;
    this.ttsChunks = [];
    this.ttsSubscriptions = [];
    this.suppressTtsCancel = false;
    this.pdfPageQueue = [];
    this.pdfPageQueueIndex = 0;
  }

  getNotesStorageKey() {
    const { subjectId, subjectname } = this.props.route.params || {};
    const id =
      subjectId != null && subjectId !== ''
        ? String(subjectId)
        : encodeURIComponent(subjectname || 'unknown');
    return `${NOTES_KEY_PREFIX}${id}`;
  }

  async loadNotes() {
    try {
      const raw = await AsyncStorage.getItem(this.getNotesStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      const notes = Array.isArray(parsed) ? parsed : [];
      notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      this.setState({ notes });
    } catch {
      this.setState({ notes: [] });
    }
  }

  setTab = tab => {
    if (tab === 'notes') {
      this.loadNotes();
      this.preloadPdfText();
    } else {
      this.cancelEdit();
      this.preloadPdfText();
    }
    this.setState({activeTab: tab});
  };

  initTts = async () => {
    try {
      await Tts.getInitStatus();
      Tts.setIgnoreSilentSwitch('ignore');
      if (Platform.OS === 'ios') {
        await Tts.setDefaultLanguage('en-US').catch(() => {});
        Tts.setDefaultRate(0.5);
      } else {
        await Tts.setDefaultLanguage('en-GB').catch(() =>
          Tts.setDefaultLanguage('en-US').catch(() => {}),
        );
        Tts.setDefaultRate(0.45);
      }
      this.setState({ ttsReady: true });
    } catch {
      this.setState({ ttsReady: false });
    }
  };

  bindTtsListeners = () => {
    this.unbindTtsListeners();
    const onFinish = () => this.onTtsUtteranceDone();
    const onCancel = () => {
      if (!this.suppressTtsCancel) {
        this.onTtsStopped();
      }
    };
    this.ttsSubscriptions = [
      Tts.addListener('tts-finish', onFinish),
      Tts.addListener('tts-cancel', onCancel),
    ];
  };

  unbindTtsListeners = () => {
    if (this.ttsSubscriptions?.length) {
      this.ttsSubscriptions.forEach(sub => sub?.remove?.());
      this.ttsSubscriptions = [];
    }
  };

  splitTextForTts(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.length <= TTS_CHUNK_SIZE) {
      return [trimmed];
    }
    const chunks = [];
    let rest = trimmed;
    while (rest.length > TTS_CHUNK_SIZE) {
      let cut = rest.lastIndexOf('\n', TTS_CHUNK_SIZE);
      if (cut < TTS_CHUNK_SIZE * 0.5) {
        cut = rest.lastIndexOf('. ', TTS_CHUNK_SIZE);
      }
      if (cut < TTS_CHUNK_SIZE * 0.5) {
        cut = rest.lastIndexOf(' ', TTS_CHUNK_SIZE);
      }
      if (cut < 1) {
        cut = TTS_CHUNK_SIZE;
      }
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) {
      chunks.push(rest);
    }
    return chunks;
  }

  async speakChunks(chunks, extraState = null) {
    if (!chunks.length) {
      return;
    }
    this.ttsChunks = chunks;
    this.ttsChunkIndex = 0;
    this.suppressTtsCancel = true;
    try {
      await Tts.stop();
    } catch {
      // ignore
    }
    this.suppressTtsCancel = false;
    Tts.speak(chunks[0]);
    this.setState({isSpeaking: true, ...(extraState || {})});
  }

  onTtsUtteranceDone = () => {
    if (this.ttsChunkIndex < this.ttsChunks.length - 1) {
      this.ttsChunkIndex += 1;
      Tts.speak(this.ttsChunks[this.ttsChunkIndex]);
      return;
    }
    if (
      this.state.readingSource === 'note' &&
      this.state.readingAll &&
      this.ttsQueueIndex < this.ttsQueue.length - 1
    ) {
      this.ttsQueueIndex += 1;
      const next = this.ttsQueue[this.ttsQueueIndex];
      this.setState({readingNoteId: next.id});
      const chunks = this.splitTextForTts(next.text);
      this.speakChunks(chunks);
      return;
    }
    if (this.state.readingSource === 'pdf') {
      this.advancePdfPageQueue();
      return;
    }
    this.onTtsStopped();
  };

  onTtsStopped = () => {
    this.ttsQueue = [];
    this.ttsQueueIndex = 0;
    this.ttsChunks = [];
    this.ttsChunkIndex = 0;
    this.pdfPageQueue = [];
    this.pdfPageQueueIndex = 0;
    this.setState({
      isSpeaking: false,
      readingSource: null,
      readingNoteId: null,
      readingAll: false,
      pdfSpeakingPage: null,
      pdfReadingAll: false,
    });
  };

  stopSpeaking = async () => {
    this.suppressTtsCancel = true;
    try {
      await Tts.stop();
    } catch {
      // ignore
    }
    this.suppressTtsCancel = false;
    this.onTtsStopped();
  };

  listenToNote = async note => {
    if (!note?.text?.trim()) {
      return;
    }
    if (!this.state.ttsReady) {
      Alert.alert(
        'Note reader',
        'Text-to-speech is not ready on this device. Check that a voice engine is installed in system settings.',
      );
      return;
    }
    if (this.state.isSpeaking && this.state.readingNoteId === note.id) {
      await this.stopSpeaking();
      return;
    }
    await this.stopSpeaking();
    this.ttsQueue = [note];
    this.ttsQueueIndex = 0;
    this.setState({
      readingSource: 'note',
      readingNoteId: note.id,
      readingAll: false,
    });
    await this.speakChunks(this.splitTextForTts(note.text));
  };

  listenToAllNotes = async () => {
    const { notes, ttsReady, isSpeaking, readingAll } = this.state;
    if (!notes.length) {
      Alert.alert('Note reader', 'Add a note first, then you can listen to it.');
      return;
    }
    if (!ttsReady) {
      Alert.alert(
        'Note reader',
        'Text-to-speech is not ready on this device. Check that a voice engine is installed in system settings.',
      );
      return;
    }
    if (isSpeaking && readingAll) {
      await this.stopSpeaking();
      return;
    }
    await this.stopSpeaking();
    const ordered = [...notes].reverse();
    this.ttsQueue = ordered;
    this.ttsQueueIndex = 0;
    this.setState({
      readingSource: 'note',
      readingNoteId: ordered[0].id,
      readingAll: true,
    });
    await this.speakChunks(this.splitTextForTts(ordered[0].text));
  };

  preloadPdfText = async () => {
    const filepath = this.pdfSourceUri || this.state.filepath;
    if (!filepath) {
      return false;
    }
    if (this.state.pdfTextReady) {
      return true;
    }
    if (this._pdfTextLoadPromise) {
      return this._pdfTextLoadPromise;
    }

    this._pdfTextLoadPromise = (async () => {
      this.setState({pdfTextLoading: true, pdfTextError: null});
      try {
        const {totalPages, pages} = await loadPdfPageTexts(filepath);
        this.setState({
          pdfPageTexts: pages,
          pdfTotalPages: totalPages,
          pdfTextReady: true,
          pdfTextLoading: false,
        });
        return true;
      } catch (e) {
        this.setState({
          pdfTextLoading: false,
          pdfTextError: e?.message || 'Could not read PDF text',
        });
        return false;
      } finally {
        this._pdfTextLoadPromise = null;
      }
    })();

    return this._pdfTextLoadPromise;
  };

  ensurePdfText = async () => {
    if (this.state.pdfTextReady) {
      return true;
    }
    const ok = await this.preloadPdfText();
    if (!ok) {
      Alert.alert(
        'Textbook reader',
        this.state.pdfTextError ||
          'Could not load textbook text. Rebuild the app after running: npm run extract-pdf-text',
      );
    }
    return ok;
  };

  pageHasReadableText = pageNum => {
    const text = this.state.pdfPageTexts[pageNum - 1];
    return !!(text && text.trim());
  };

  buildPdfPageQueue = (fromPage, toPage) => {
    const pages = [];
    for (let p = fromPage; p <= toPage; p += 1) {
      if (this.pageHasReadableText(p)) {
        pages.push(p);
      }
    }
    return pages;
  };

  speakPdfPageNum = async pageNum => {
    const text = (this.state.pdfPageTexts[pageNum - 1] || '').trim();
    if (!text) {
      this.advancePdfPageQueue();
      return;
    }
    await this.speakChunks(this.splitTextForTts(`Page ${pageNum}. ${text}`), {
      pdfSpeakingPage: pageNum,
    });
  };

  advancePdfPageQueue = () => {
    if (this.pdfPageQueueIndex < this.pdfPageQueue.length - 1) {
      this.pdfPageQueueIndex += 1;
      const nextPage = this.pdfPageQueue[this.pdfPageQueueIndex];
      this.speakPdfPageNum(nextPage);
      return;
    }
    this.onTtsStopped();
  };

  startPdfPageQueue = async (pages, {readingAll = false} = {}) => {
    if (!this.state.ttsReady) {
      Alert.alert(
        'PDF reader',
        'Text-to-speech is not ready on this device. Check that a voice engine is installed in system settings.',
      );
      return;
    }
    const ready = await this.ensurePdfText();
    if (!ready) {
      return;
    }
    const queue = pages.filter(p => this.pageHasReadableText(p));
    if (!queue.length) {
      Alert.alert(
        'PDF reader',
        'No readable text found on the selected page(s). This PDF may be image-based.',
      );
      return;
    }
    await this.stopSpeaking();
    this.pdfPageQueue = queue;
    this.pdfPageQueueIndex = 0;
    this.setState({
      readingSource: 'pdf',
      readingNoteId: null,
      readingAll: false,
      pdfReadingAll: readingAll,
    });
    await this.speakPdfPageNum(queue[0]);
  };

  listenToPdfCurrentPage = async () => {
    const {pdfCurrentPage, isSpeaking, readingSource, pdfSpeakingPage} =
      this.state;
    if (
      isSpeaking &&
      readingSource === 'pdf' &&
      pdfSpeakingPage === pdfCurrentPage
    ) {
      await this.stopSpeaking();
      return;
    }
    await this.startPdfPageQueue([pdfCurrentPage]);
  };

  listenToPdfFromHere = async () => {
    const {pdfCurrentPage, pdfTotalPages, isSpeaking, pdfReadingAll} =
      this.state;
    if (isSpeaking && pdfReadingAll) {
      await this.stopSpeaking();
      return;
    }
    const pages = [];
    for (let p = pdfCurrentPage; p <= pdfTotalPages; p += 1) {
      pages.push(p);
    }
    await this.startPdfPageQueue(pages);
  };

  listenToAllPdfPages = async () => {
    const {pdfTotalPages, isSpeaking, pdfReadingAll} = this.state;
    if (isSpeaking && pdfReadingAll) {
      await this.stopSpeaking();
      return;
    }
    const pages = [];
    for (let p = 1; p <= pdfTotalPages; p += 1) {
      pages.push(p);
    }
    await this.startPdfPageQueue(pages, {readingAll: true});
  };

  async persistNotes(notes) {
    try {
      await AsyncStorage.setItem(
        this.getNotesStorageKey(),
        JSON.stringify(notes),
      );
      this.setState({ notes });
    } catch {
      // user can retry
    }
  }

  async saveNote() {
    const text = (this.state.draftNote || '').trim();
    if (!text) {
      return;
    }
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      createdAt: Date.now(),
    };
    const next = [note, ...this.state.notes];
    await this.persistNotes(next);
    this.setState({ draftNote: '' });
  }

  startEdit = note => {
    this.stopSpeaking();
    this.setState({
      editingNoteId: note.id,
      editDraft: note.text || '',
    });
  };

  cancelEdit = () => {
    this.setState({ editingNoteId: null, editDraft: '' });
  };

  async saveEdit() {
    const { editingNoteId, editDraft, notes } = this.state;
    const text = (editDraft || '').trim();
    if (!editingNoteId || !text) {
      return;
    }
    const next = notes.map(n =>
      n.id === editingNoteId
        ? { ...n, text, updatedAt: Date.now() }
        : n,
    );
    await this.persistNotes(next);
    this.setState({ editingNoteId: null, editDraft: '' });
  }

  confirmDeleteNote = note => {
    Alert.alert(
      'Delete note',
      'Remove this note? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = this.state.notes.filter(n => n.id !== note.id);
            if (this.state.editingNoteId === note.id) {
              this.setState({ editingNoteId: null, editDraft: '' });
            }
            await this.persistNotes(next);
          },
        },
      ],
    );
  }

  componentDidMount() {
    this.backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      this.handleBackButtonClick,
    );
    const { subjectname } = this.props.route.params || {};
    this.props.navigation.setOptions({
      title: subjectname,
      headerRight: () => null,
    });
    const {filepath} = this.props.route?.params || {};
    this.pdfSourceUri = filepath;
    this.pdfSource = filepath ? {uri: filepath, cache: true} : null;

    this.loadNotes();
    this.bindTtsListeners();
    this.initTts();
    this.preloadPdfText();
  }

  onPdfLoadComplete = numberOfPages => {
    this.setState({pdfTotalPages: numberOfPages});
  };

  onPdfPageChanged = (page, numberOfPages) => {
    this.setState({
      pdfCurrentPage: page,
      pdfTotalPages: numberOfPages,
    });
  };

  onPdfScaleChanged = scale => {
    const next = Math.min(
      PDF_MAX_SCALE,
      Math.max(PDF_MIN_SCALE, scale),
    );
    if (Math.abs(next - this.pdfScale) > 0.01) {
      this.pdfScale = next;
    }
  };

  applyPdfScale = scale => {
    this.pdfScale = scale;
    if (this.pdfRef?.setNativeProps) {
      this.pdfRef.setNativeProps({scale: this.pdfScale});
    }
  };

  componentWillUnmount() {
    this.backHandler?.remove();
    this.stopSpeaking();
    this.unbindTtsListeners();
  }

  handleBackButtonClick() {
    if (this.state.activeTab === 'notes' && this.state.editingNoteId) {
      this.cancelEdit();
      return true;
    }
    this.props.navigation.goBack(null);
    return true;
  }

  formatNoteDate(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  }

  noteMetaLine(item) {
    const created = this.formatNoteDate(item.createdAt);
    if (item.updatedAt && item.updatedAt !== item.createdAt) {
      return `${created} · edited ${this.formatNoteDate(item.updatedAt)}`;
    }
    return created;
  }

  pdfReaderStatusText() {
    const {
      isSpeaking,
      pdfTextLoading,
      pdfTextReady,
      pdfTextError,
      pdfCurrentPage,
      pdfTotalPages,
      pdfSpeakingPage,
      pdfReadingAll,
      readingSource,
    } = this.state;

    if (pdfTextLoading) {
      return 'Preparing PDF text for audio…';
    }
    if (pdfTextError) {
      return pdfTextError;
    }
    if (!pdfTextReady) {
      return 'Loading PDF text for audio…';
    }
    if (isSpeaking && readingSource === 'pdf') {
      const queuePos = this.pdfPageQueueIndex + 1;
      const queueTotal = this.pdfPageQueue.length;
      if (pdfReadingAll && queueTotal > 1) {
        return `Reading page ${pdfSpeakingPage} (${queuePos} of ${queueTotal})`;
      }
      return `Reading page ${pdfSpeakingPage} of ${pdfTotalPages}`;
    }
    return `Ready · swipe to change page`;
  }

  readerStatusText() {
    const {readingSource, isSpeaking} = this.state;
    if (isSpeaking && readingSource === 'pdf') {
      return this.pdfReaderStatusText();
    }
    const {readingNoteId, readingAll, notes} = this.state;
    if (!isSpeaking || readingSource !== 'note') {
      return 'Read the textbook or your saved notes aloud';
    }
    const idx = notes.findIndex(n => n.id === readingNoteId);
    const label = idx >= 0 ? `Note ${notes.length - idx}` : 'Note';
    if (readingAll) {
      const queuePos = this.ttsQueue.findIndex(n => n.id === readingNoteId) + 1;
      const total = this.ttsQueue.length;
      return `Reading ${queuePos} of ${total} · ${label}`;
    }
    return `Reading ${label}…`;
  }

  zoomPdfIn = () => {
    this.applyPdfScale(
      Math.min(PDF_MAX_SCALE, this.pdfScale + PDF_SCALE_STEP),
    );
    this.forceUpdate();
  };

  zoomPdfOut = () => {
    this.applyPdfScale(
      Math.max(PDF_MIN_SCALE, this.pdfScale - PDF_SCALE_STEP),
    );
    this.forceUpdate();
  };

  renderPdfZoomControls() {
    const atMin = this.pdfScale <= PDF_MIN_SCALE;
    const atMax = this.pdfScale >= PDF_MAX_SCALE;

    return (
      <View style={styles.pdfZoomRail} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.pdfZoomBtn, atMax && styles.pdfZoomBtnDisabled]}
          onPress={this.zoomPdfIn}
          disabled={atMax}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Zoom in">
          <Text style={styles.pdfZoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pdfZoomBtn, atMin && styles.pdfZoomBtnDisabled]}
          onPress={this.zoomPdfOut}
          disabled={atMin}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Zoom out">
          <Text style={styles.pdfZoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>
    );
  }

  pdfListenProgress() {
    const {pdfTotalPages, pdfSpeakingPage, isSpeaking, readingSource} = this.state;
    if (!isSpeaking || readingSource !== 'pdf' || !pdfTotalPages) {
      return 0;
    }
    const page = pdfSpeakingPage || 1;
    return Math.min(1, Math.max(0, page / pdfTotalPages));
  }

  renderPdfModeChip = (key, icon, label, active, onPress, disabled) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.pdfModeChip,
        active && styles.pdfModeChipActive,
        disabled && styles.pdfModeChipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{selected: active, disabled}}>
      <Text style={[styles.pdfModeIcon, active && styles.pdfModeIconActive]}>
        {icon}
      </Text>
      <Text
        style={[styles.pdfModeLabel, active && styles.pdfModeLabelActive]}
        numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  renderPdfReaderBar() {
    const {
      isSpeaking,
      readingSource,
      pdfSpeakingPage,
      pdfCurrentPage,
      pdfTotalPages,
      pdfTextLoading,
      pdfTextError,
      ttsReady,
      pdfReadingAll,
    } = this.state;
    const canListen = ttsReady && !pdfTextLoading && !pdfTextError;
    const isPdfSpeaking = isSpeaking && readingSource === 'pdf';
    const pageActive =
      isPdfSpeaking && pdfSpeakingPage === pdfCurrentPage && !pdfReadingAll;
    const fromHereActive = isPdfSpeaking && !pdfReadingAll && !pageActive;
    const allActive = isPdfSpeaking && pdfReadingAll;
    const progress = this.pdfListenProgress();
    const statusText = this.pdfReaderStatusText();

    return (
      <View style={styles.pdfReaderPanel}>
        <View style={styles.pdfReaderCard}>
          <View style={styles.pdfReaderHeader}>
            <View style={styles.pdfReaderIconCircle}>
              {pdfTextLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text style={styles.pdfReaderEmoji}>
                  {isPdfSpeaking ? '🔊' : '🎧'}
                </Text>
              )}
            </View>
            <View style={styles.pdfReaderHeaderBody}>
              <Text style={styles.pdfReaderTitle}>Listen aloud</Text>
              <Text style={styles.pdfReaderSubtitle} numberOfLines={2}>
                {statusText}
              </Text>
            </View>
            {pdfTotalPages > 0 ? (
              <View style={styles.pdfPageBadge}>
                <Text style={styles.pdfPageBadgeCurrent}>
                  {isPdfSpeaking ? pdfSpeakingPage : pdfCurrentPage}
                </Text>
                <Text style={styles.pdfPageBadgeTotal}>/{pdfTotalPages}</Text>
              </View>
            ) : null}
          </View>

          {isPdfSpeaking ? (
            <View style={styles.pdfProgressTrack}>
              <View
                style={[
                  styles.pdfProgressFill,
                  {width: `${Math.round(progress * 100)}%`},
                ]}
              />
            </View>
          ) : null}

          <View style={styles.pdfModeRow}>
            {this.renderPdfModeChip(
              'page',
              pageActive ? '⏹' : '▶',
              pageActive ? 'Stop' : 'This page',
              pageActive,
              () => this.listenToPdfCurrentPage(),
              !canListen,
            )}
            {this.renderPdfModeChip(
              'here',
              '⏭',
              'From here',
              fromHereActive,
              () => this.listenToPdfFromHere(),
              !canListen,
            )}
            {this.renderPdfModeChip(
              'all',
              allActive ? '⏹' : '📖',
              allActive ? 'Stop' : 'All pages',
              allActive,
              () => this.listenToAllPdfPages(),
              !canListen,
            )}
            {isPdfSpeaking ? (
              <TouchableOpacity
                style={styles.pdfStopFab}
                onPress={() => this.stopSpeaking()}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Stop reading">
                <Text style={styles.pdfStopFabIcon}>■</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  renderNoteReaderBar() {
    const {
      isSpeaking,
      readingAll,
      readingSource,
      notes,
      ttsReady,
      pdfTextLoading,
      pdfTextError,
      pdfTextReady,
      pdfCurrentPage,
      pdfSpeakingPage,
      pdfReadingAll,
    } = this.state;
    const canReadPdf = ttsReady && !pdfTextLoading && !pdfTextError;
    const canPlayAllNotes = notes.length > 0 && ttsReady;
    const isPdfSpeaking = isSpeaking && readingSource === 'pdf';
    const pageActive =
      isPdfSpeaking && pdfSpeakingPage === pdfCurrentPage && !pdfReadingAll;
    const fromHereActive = isPdfSpeaking && !pdfReadingAll && !pageActive;
    const allPdfActive = isPdfSpeaking && pdfReadingAll;
    const notesAllActive = isSpeaking && readingAll && readingSource === 'note';

    return (
      <View style={styles.pdfReaderPanel}>
        <View style={styles.pdfReaderCard}>
          <View style={styles.pdfReaderHeader}>
            <View style={styles.pdfReaderIconCircle}>
              {pdfTextLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text style={styles.pdfReaderEmoji}>
                  {isSpeaking ? '🔊' : '🎧'}
                </Text>
              )}
            </View>
            <View style={styles.pdfReaderHeaderBody}>
              <Text style={styles.pdfReaderTitle}>Audio reader</Text>
              <Text style={styles.pdfReaderSubtitle} numberOfLines={2}>
                {this.readerStatusText()}
              </Text>
            </View>
          </View>

          <Text style={styles.readerSectionLabel}>Textbook</Text>
          <View style={styles.pdfModeRow}>
            {this.renderPdfModeChip(
              'page',
              pageActive ? '⏹' : '▶',
              pageActive ? 'Stop' : 'This page',
              pageActive,
              () => this.listenToPdfCurrentPage(),
              !canReadPdf,
            )}
            {this.renderPdfModeChip(
              'here',
              '⏭',
              'From here',
              fromHereActive,
              () => this.listenToPdfFromHere(),
              !canReadPdf,
            )}
            {this.renderPdfModeChip(
              'all',
              allPdfActive ? '⏹' : '📖',
              allPdfActive ? 'Stop' : 'All pages',
              allPdfActive,
              () => this.listenToAllPdfPages(),
              !canReadPdf,
            )}
          </View>

          <Text style={styles.readerSectionLabel}>Your notes</Text>
          <View style={styles.pdfModeRow}>
            {this.renderPdfModeChip(
              'notes',
              notesAllActive ? '⏹' : '📝',
              notesAllActive ? 'Stop' : 'All notes',
              notesAllActive,
              () => this.listenToAllNotes(),
              !canPlayAllNotes,
            )}
            {isSpeaking ? (
              <TouchableOpacity
                style={styles.pdfStopFab}
                onPress={() => this.stopSpeaking()}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Stop reading">
                <Text style={styles.pdfStopFabIcon}>■</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!pdfTextReady && !pdfTextLoading && pdfTextError ? (
            <Text style={styles.readerErrorHint}>{pdfTextError}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  render() {
    const {
      notes,
      draftNote,
      activeTab,
      editingNoteId,
      editDraft,
      isSpeaking,
      readingNoteId,
      ttsReady,
    } = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pdf' && styles.tabActive]}
            onPress={() => this.setTab('pdf')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'pdf' }}>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'pdf' && styles.tabLabelActive,
              ]}>
              Read
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
            onPress={() => this.setTab('notes')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'notes' }}>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'notes' && styles.tabLabelActive,
              ]}>
              Notes
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'pdf' ? (
          <View style={styles.pdfWrapper}>
            {this.pdfSource ? (
              <PdfViewer
                source={this.pdfSource}
                sourceUri={this.pdfSourceUri}
                pdfRef={ref => {
                  this.pdfRef = ref;
                }}
                onLoadComplete={this.onPdfLoadComplete}
                onPageChanged={this.onPdfPageChanged}
                onScaleChanged={this.onPdfScaleChanged}
              />
            ) : null}
            {this.renderPdfZoomControls()}
            {this.renderPdfReaderBar()}
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.notesPanel}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
            <Text style={styles.notesHint}>
              Save notes below. Use Audio reader to hear the textbook or your
              notes. Switch to Read to view pages while listening.
            </Text>
            {this.renderNoteReaderBar()}
            <ScrollView
              style={styles.notesList}
              contentContainerStyle={styles.notesListContent}
              keyboardShouldPersistTaps="handled">
              {notes.length === 0 ? (
                <Text style={styles.emptyNotes}>
                  No notes yet. Add your first note below.
                </Text>
              ) : (
                notes.map(item =>
                  editingNoteId === item.id ? (
                    <View key={item.id} style={styles.noteCard}>
                      <Text style={[styles.noteDate, styles.noteDateEditBlock]}>
                        {this.noteMetaLine(item)}
                      </Text>
                      <TextInput
                        style={styles.editInput}
                        multiline
                        value={editDraft}
                        onChangeText={t => this.setState({ editDraft: t })}
                        maxLength={8000}
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.textBtn}
                          onPress={this.cancelEdit}>
                          <Text style={styles.textBtnLabel}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.updateBtn,
                            !editDraft.trim() && styles.saveBtnDisabled,
                          ]}
                          onPress={() => this.saveEdit()}
                          disabled={!editDraft.trim()}>
                          <Text style={styles.saveBtnText}>Update</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View
                      key={item.id}
                      style={[
                        styles.noteCard,
                        readingNoteId === item.id &&
                          isSpeaking &&
                          styles.noteCardReading,
                      ]}>
                      <View style={styles.noteCardHeader}>
                        <Text style={styles.noteDate} numberOfLines={2}>
                          {this.noteMetaLine(item)}
                        </Text>
                        <View style={styles.noteActions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => this.listenToNote(item)}
                            disabled={!ttsReady}
                            accessibilityLabel={
                              isSpeaking && readingNoteId === item.id
                                ? 'Stop reading this note'
                                : 'Listen to this note'
                            }>
                            <Text
                              style={[
                                styles.actionListen,
                                isSpeaking &&
                                  readingNoteId === item.id &&
                                  styles.actionListenActive,
                                !ttsReady && styles.actionDisabled,
                              ]}>
                              {isSpeaking && readingNoteId === item.id
                                ? 'Stop'
                                : 'Listen'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => this.startEdit(item)}
                            accessibilityLabel="Edit note">
                            <Text style={styles.actionEdit}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => this.confirmDeleteNote(item)}
                            accessibilityLabel="Delete note">
                            <Text style={styles.actionDelete}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.noteBody}>{item.text}</Text>
                    </View>
                  ),
                )
              )}
            </ScrollView>

            <View style={styles.composeRow}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a new note…"
                placeholderTextColor="#888"
                multiline
                value={draftNote}
                onChangeText={t => this.setState({ draftNote: t })}
                maxLength={8000}
              />
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  !draftNote.trim() && styles.saveBtnDisabled,
                ]}
                onPress={() => this.saveNote()}
                disabled={!draftNote.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save note">
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#e8e8ed',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#007AFF',
  },
  pdfWrapper: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  pdfZoomRail: {
    position: 'absolute',
    right: 12,
    top: '38%',
    zIndex: 10,
    alignItems: 'center',
  },
  pdfZoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  pdfZoomBtnDisabled: {
    opacity: 0.35,
  },
  pdfZoomBtnText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#4F46E5',
    lineHeight: 28,
    marginTop: -2,
  },
  pdfReaderPanel: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: '#F1F5F9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  pdfReaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  pdfReaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pdfReaderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pdfReaderEmoji: {
    fontSize: 22,
  },
  pdfReaderHeaderBody: {
    flex: 1,
    marginRight: 8,
  },
  pdfReaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  pdfReaderSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  pdfPageBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pdfPageBadgeCurrent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  pdfPageBadgeTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pdfProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  pdfProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#4F46E5',
  },
  pdfModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfModeChip: {
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pdfModeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  pdfModeChipDisabled: {
    opacity: 0.4,
  },
  pdfModeIcon: {
    fontSize: 12,
    marginRight: 4,
    color: '#64748B',
  },
  pdfModeIconActive: {
    color: '#FFFFFF',
  },
  pdfModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pdfModeLabelActive: {
    color: '#FFFFFF',
  },
  pdfStopFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfStopFabIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  readerSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  readerErrorHint: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 10,
    lineHeight: 16,
  },
  notesPanel: {
    flex: 1,
    backgroundColor: '#fff',
  },
  notesHint: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emptyNotes: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    paddingVertical: 8,
  },
  noteCard: {
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  actionEdit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionDelete: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D92D20',
  },
  noteDate: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  noteDateEditBlock: {
    flex: 0,
    marginBottom: 8,
    marginRight: 0,
  },
  noteBody: {
    fontSize: 16,
    color: '#222',
    lineHeight: 22,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  noteInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
    marginLeft: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  editInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  textBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  textBtnLabel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  updateBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  readerBar: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eef5ff',
    borderWidth: 1,
    borderColor: '#c5daf7',
  },
  readerBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  readerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a4d8c',
  },
  readerStatus: {
    fontSize: 13,
    color: '#445',
    lineHeight: 18,
    marginBottom: 10,
  },
  readerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginRight: 8,
  },
  readerBtnPrimary: {
    backgroundColor: '#007AFF',
  },
  readerBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  readerBtnStop: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D92D20',
  },
  readerBtnStopText: {
    color: '#D92D20',
    fontWeight: '700',
    fontSize: 14,
  },
  readerBtnDisabled: {
    opacity: 0.45,
  },
  noteCardReading: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  actionListen: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5856D6',
  },
  actionListenActive: {
    color: '#D92D20',
  },
  actionDisabled: {
    opacity: 0.4,
  },
});
