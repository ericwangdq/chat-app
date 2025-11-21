import 'package:flutter/material.dart';
import 'login_screen.dart';

void main() {
  runApp(const ChatApp());
}

class ChatApp extends StatelessWidget {
  const ChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chat App',
      // theme: ThemeData(primarySwatch: Colors.blue),
      theme:
          ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.white)),
      home: const LoginScreen(),
    );
  }
}
