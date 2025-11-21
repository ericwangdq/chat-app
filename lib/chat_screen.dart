import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'chat_service.dart';
import 'auth_service.dart';
import 'login_screen.dart';

class ChatScreen extends StatefulWidget {
  final String username;
  final String token;

  const ChatScreen({
    super.key,
    required this.username,
    required this.token,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final ChatService _service;
  late final AuthService _authService;
  final List<Map<String, dynamic>> _messages = [];
  final _controller = TextEditingController();
  late StreamSubscription _sub;

  @override
  void initState() {
    super.initState();
    _authService = AuthService();
    _service = ChatService(
      wsUrl: 'ws://localhost:3000',
      restUrl: 'http://localhost:3000',
      token: widget.token,
    );
    _service.connect();
    _service.fetchHistory().then((hist) {
      setState(() {
        _messages.addAll(hist);
      });
    });
    _sub =
        _service.messages?.listen((dynamic event) {
          try {
            final m = jsonDecode(event as String) as Map<String, dynamic>;
            setState(() {
              _messages.insert(0, m);
            });
          } catch (_) {}
        }) ??
        const Stream.empty().listen((_) {});
  }

  @override
  void dispose() {
    _sub.cancel();
    _service.disconnect();
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _service.sendMessage(text);
    _controller.clear();
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat - ${widget.username}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              reverse: true,
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final m = _messages[index];
                final author = m['author'] ?? 'unknown';
                final text = m['text'] ?? '';
                return ListTile(title: Text(author), subtitle: Text(text));
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        hintText: 'Type a message',
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(onPressed: _send, icon: const Icon(Icons.send)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
