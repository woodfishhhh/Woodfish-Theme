// Comparison sample: an in-memory key-value store with expiry and a TCP front end.
package kvstore

import (
	"bufio"
	"container/list"
	"errors"
	"fmt"
	"log"
	"net"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	defaultTTL  = 30 * time.Second
	maxKeyBytes = 256
	protocol    = "kv/1"
	loadFactor  = 0.75
)

type Kind uint8

const (
	KindString Kind = iota + 1
	KindInt
	KindList
)

var (
	ErrNotFound = errors.New("kvstore: key not found")
	ErrTooLong  = fmt.Errorf("kvstore: key longer than %d bytes", maxKeyBytes)
	hits, miss  atomic.Int64
)

type item struct {
	kind    Kind
	text    string
	number  int64
	items   *list.List
	expires time.Time
}

func (i *item) expired(now time.Time) bool {
	return !i.expires.IsZero() && now.After(i.expires)
}

// Store is safe for concurrent use.
type Store struct {
	mu    sync.RWMutex
	data  map[string]*item
	clock func() time.Time
	stop  chan struct{}
}

type Option func(*Store)

func WithClock(clock func() time.Time) Option {
	return func(s *Store) { s.clock = clock }
}

func New(opts ...Option) *Store {
	s := &Store{
		data:  make(map[string]*item),
		clock: time.Now,
		stop:  make(chan struct{}),
	}
	for _, opt := range opts {
		opt(s)
	}
	go s.sweep(time.Minute)
	return s
}

func (s *Store) sweep(every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			s.mu.Lock()
			now := s.clock()
			for key, it := range s.data {
				if it.expired(now) {
					delete(s.data, key)
				}
			}
			s.mu.Unlock()
		case <-s.stop:
			return
		}
	}
}

func (s *Store) Set(key, value string, ttl time.Duration) error {
	if len(key) > maxKeyBytes {
		return ErrTooLong
	}
	it := &item{kind: KindString, text: value}
	if ttl > 0 {
		it.expires = s.clock().Add(ttl)
	}
	s.mu.Lock()
	s.data[key] = it
	s.mu.Unlock()
	return nil
}

func (s *Store) Get(key string) (string, error) {
	s.mu.RLock()
	it, ok := s.data[key]
	s.mu.RUnlock()
	if !ok || it.expired(s.clock()) {
		miss.Add(1)
		return "", ErrNotFound
	}
	hits.Add(1)
	return it.text, nil
}

func (s *Store) Incr(key string, by int64) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	it, ok := s.data[key]
	if !ok {
		it = &item{kind: KindInt}
		s.data[key] = it
	}
	if it.kind != KindInt {
		return 0, fmt.Errorf("kvstore: %q is not a number", key)
	}
	it.number += by
	return it.number, nil
}

func (s *Store) Close() { close(s.stop) }

type Stats struct {
	Keys   int
	Hits   int64
	Misses int64
}

func (s *Store) Stats() Stats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Stats{Keys: len(s.data), Hits: hits.Load(), Misses: miss.Load()}
}

func handle(conn net.Conn, store *Store) {
	defer conn.Close()
	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		var reply string
		switch strings.ToUpper(fields[0]) {
		case "SET":
			if len(fields) < 3 {
				reply = "ERR usage: SET key value"
				break
			}
			if err := store.Set(fields[1], fields[2], defaultTTL); err != nil {
				reply = "ERR " + err.Error()
			} else {
				reply = "OK"
			}
		case "GET":
			value, err := store.Get(fields[1])
			if errors.Is(err, ErrNotFound) {
				reply = "(nil)"
			} else {
				reply = value
			}
		case "INCR":
			n, _ := store.Incr(fields[1], 1)
			reply = strconv.FormatInt(n, 10)
		default:
			reply = fmt.Sprintf("ERR unknown command %q", fields[0])
		}
		fmt.Fprintf(conn, "%s\r\n", reply)
	}
}

func Serve(addr string) error {
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	store := New()
	defer store.Close()
	log.Printf("%s listening on %s (load factor %.2f)", protocol, addr, loadFactor)
	for {
		conn, err := listener.Accept()
		if err != nil {
			return err
		}
		go handle(conn, store)
	}
}
