import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;

class ChatService {
  final String wsUrl; // e.g. ws://localhost:3000
  final String restUrl; // e.g. http://localhost:3000
  final String token;
  WebSocketChannel? _channel;

  ChatService({
    required this.wsUrl,
    required this.restUrl,
    required this.token,
  });

  void connect() {
    // Add token as query parameter for WebSocket authentication
    final wsUrlWithToken = '$wsUrl?token=$token';
    _channel = WebSocketChannel.connect(Uri.parse(wsUrlWithToken));
  }

  Stream<dynamic>? get messages => _channel?.stream;

  void sendMessage(String text) {
    // Only send text; backend will use authenticated username as author
    final msg = jsonEncode({'text': text});
    _channel?.sink.add(msg);
  }

  Future<List<Map<String, dynamic>>> fetchHistory() async {
    try {
      final response = await http.get(
        Uri.parse('$restUrl/history'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List<dynamic>;
        return data.cast<Map<String, dynamic>>();
      }
    } catch (_) {
      // ignore and return empty list if backend unreachable
    }
    return <Map<String, dynamic>>[];
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
