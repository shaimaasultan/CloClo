using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using Controls = System.Windows.Controls;
using MediaColor = System.Windows.Media.Color;

namespace CloCloWidget;

// A real converter, not just a one-shot lookup — the value and source unit
// are both editable, and every other unit in the same category converts
// and updates live alongside it, entirely locally (no network call).
public partial class UnitConverterWindow : Window
{
    private readonly string _category;

    public UnitConverterWindow(UnitConverter.ParsedSelection parsed)
    {
        InitializeComponent();
        _category = parsed.Category;
        ValueBox.Text = UnitConverter.FormatNumber(parsed.Value);

        var units = UnitConverter.Categories[_category];
        UnitCombo.ItemsSource = units;
        UnitCombo.SelectedItem = units.First(u => u.Key == parsed.UnitKey);

        ValueBox.TextChanged += (_, _) => RecalculateLocal();
        UnitCombo.SelectionChanged += (_, _) => RecalculateLocal();

        RecalculateLocal();
    }

    private void RecalculateLocal()
    {
        ResultsPanel.Children.Clear();
        if (UnitCombo.SelectedItem is not UnitConverter.UnitDef fromUnit) return;
        if (!double.TryParse(ValueBox.Text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)) return;

        var results = UnitConverter.ConvertLocal(_category, fromUnit.Key, value);
        foreach (var u in UnitConverter.Categories[_category])
        {
            if (u.Key == fromUnit.Key) continue;
            AddResultRow(u.Label, UnitConverter.FormatNumber(results[u.Key]));
        }
    }

    private void AddResultRow(string label, string value)
    {
        var grid = new Controls.Grid { Margin = new Thickness(0, 0, 0, 8) };
        grid.ColumnDefinitions.Add(new Controls.ColumnDefinition { Width = new GridLength(42) });
        grid.ColumnDefinitions.Add(new Controls.ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new Controls.ColumnDefinition { Width = GridLength.Auto });

        var labelBlock = new Controls.TextBlock
        {
            Text = label,
            Foreground = new SolidColorBrush(MediaColor.FromRgb(0xf3, 0xec, 0xdd)),
            VerticalAlignment = VerticalAlignment.Center,
            FontWeight = FontWeights.Bold,
        };
        Controls.Grid.SetColumn(labelBlock, 0);

        // Background/Foreground/BorderBrush/padding come from the window's
        // own implicit TextBox style (see UnitConverterWindow.xaml) — only
        // IsReadOnly needs setting explicitly here, since ValueBox (the
        // one editable TextBox in this window) must NOT share that.
        var textBox = new Controls.TextBox
        {
            Text = value,
            Margin = new Thickness(0, 0, 6, 0),
            IsReadOnly = true,
        };
        Controls.Grid.SetColumn(textBox, 1);

        var copyButton = new Controls.Button { Content = "Copy" };
        Controls.Grid.SetColumn(copyButton, 2);
        copyButton.Click += (_, _) =>
        {
            System.Windows.Clipboard.SetText(value);
            copyButton.Content = "Copied!";
        };

        grid.Children.Add(labelBlock);
        grid.Children.Add(textBox);
        grid.Children.Add(copyButton);
        ResultsPanel.Children.Add(grid);
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
