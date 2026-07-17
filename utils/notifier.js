const notifier = notifier.notify({
    title: 'Salutations!',
    // message: 'Hey there!',
    message: `mess`,
    icon: path.join(__dirname, 'icon.jpg'),
    sound: true,
    wait: true
  })

module.exports = notifier