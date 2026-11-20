// Statistics corpus: a concurrent word counter with a small HTTP front end.
package wordcount

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
)

const (
	DefaultWorkers = 4
	maxLineLength  = 1 << 16
	version        = "1.2.0"
	pi             = 3.14159
	newline        = '\n'
	tab            = "\t"
	quote          = '\''
	letter         = 'x'
)

type Level int

const (
	Debug Level = iota
	Info
	Warn
	Error
)

var (
	ErrEmpty     = errors.New("wordcount: empty input")
	defaultStops = map[string]struct{}{"the": {}, "a": {}, "of": {}}
	mu           sync.Mutex
)

// Counter accumulates word frequencies.
type Counter struct {
	counts map[string]int
	stops  map[string]struct{}
	mu     sync.RWMutex
	level  Level
}

type Entry struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
	Rank  *int   `json:"rank,omitempty"`
}

type Number interface {
	~int | ~int64 | ~float64
}

type Source interface {
	Open(ctx context.Context) (io.ReadCloser, error)
	Name() string
}

type fileSource struct{ path string }

func (f fileSource) Name() string { return f.path }

func (f fileSource) Open(ctx context.Context) (io.ReadCloser, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return os.Open(f.path)
}

func NewCounter(stops ...string) *Counter {
	c := &Counter{counts: make(map[string]int), stops: defaultStops, level: Info}
	if len(stops) > 0 {
		c.stops = make(map[string]struct{}, len(stops))
		for _, word := range stops {
			c.stops[strings.ToLower(word)] = struct{}{}
		}
	}
	return c
}

func (c *Counter) Add(word string) bool {
	word = strings.ToLower(strings.TrimFunc(word, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	}))
	if word == "" {
		return false
	}
	if _, skip := c.stops[word]; skip {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.counts[word]++
	return true
}

func (c *Counter) Top(n int) []Entry {
	c.mu.RLock()
	defer c.mu.RUnlock()
	entries := make([]Entry, 0, len(c.counts))
	for word, count := range c.counts {
		entries = append(entries, Entry{Word: word, Count: count})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Count == entries[j].Count {
			return entries[i].Word < entries[j].Word
		}
		return entries[i].Count > entries[j].Count
	})
	if n < len(entries) {
		entries = entries[:n]
	}
	for i := range entries {
		rank := i + 1
		entries[i].Rank = &rank
	}
	return entries
}

func Sum[T Number](values []T) T {
	var total T
	for _, v := range values {
		total += v
	}
	return total
}

func Map[T, U any](values []T, f func(T) U) []U {
	out := make([]U, len(values))
	for i, v := range values {
		out[i] = f(v)
	}
	return out
}

func (c *Counter) CountAll(ctx context.Context, sources []Source) error {
	if len(sources) == 0 {
		return ErrEmpty
	}
	var wg sync.WaitGroup
	lines := make(chan string, DefaultWorkers*2)
	errs := make(chan error, len(sources))

	for _, src := range sources {
		wg.Add(1)
		go func(src Source) {
			defer wg.Done()
			reader, err := src.Open(ctx)
			if err != nil {
				errs <- fmt.Errorf("open %s: %w", src.Name(), err)
				return
			}
			defer reader.Close()
			scanner := bufio.NewScanner(reader)
			scanner.Buffer(make([]byte, 0, 4096), maxLineLength)
			for scanner.Scan() {
				select {
				case lines <- scanner.Text():
				case <-ctx.Done():
					return
				}
			}
		}(src)
	}

	go func() {
		wg.Wait()
		close(lines)
	}()

	for line := range lines {
		for _, word := range strings.Fields(line) {
			c.Add(word)
		}
	}
	close(errs)
	var joined error
	for err := range errs {
		joined = errors.Join(joined, err)
	}
	return joined
}

func (c *Counter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(c.Top(10)); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	counter := NewCounter()
	if err := counter.CountAll(ctx, []Source{fileSource{path: "input.txt"}}); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	total := Sum(Map(counter.Top(3), func(e Entry) int { return e.Count }))
	fmt.Printf("top words: %d (v%s, %.2f)\n", total, version, pi)
	var raw interface{} = counter
	if handler, ok := raw.(http.Handler); ok {
		http.Handle("/top", handler)
	}
}
