import { AfterViewInit } from '@angular/core';
import { Component } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { AuthService, SpotifyHttpClientService, SpotifyPlaylistTrackObject } from 'spotify-lib';
import { AnimationService } from 'src/app/rendering/animation.service';
import { RenderingService } from 'src/app/rendering/rendering.service';
import { CountryDataService } from 'src/app/shared/country-data.service';
import { catchError, map } from 'rxjs/operators'
import { CountryChart } from 'src/app/shared/types';


@Component({
  selector: 'app-main-view',
  templateUrl: './main-view.component.html',
  styleUrls: ['./main-view.component.css']
})
export class MainViewComponent implements AfterViewInit {

  private charts: Map<string, CountryChart> = new Map();

  public countrySelected = false;

  constructor(
    private countryDataService: CountryDataService,
    private renderingService: RenderingService,
    private animationService: AnimationService,
    private authService: AuthService,
    private spotifyService: SpotifyHttpClientService ) {
      this.renderingService.registerOnCountrySelectedCallback(() => {
        this.countrySelected = true;
      })
    }

  ngAfterViewInit(){
    this.fetchNextCountry(0, this.countryDataService.countryNames.length);
  }

  private fetchNextCountry(at: number, stop: number) {
    if (at >= stop) {
      this.readyToRender();
      return;
    }

    const requests = [];

    let step = stop - at;

    //TODO figure out how many requests we can send before we get timed-out; 30?
    if (step > 10) step = 10;

    for (let i = at; i < at + step; ++i) {
      const request =  this.spotifyService.getCountryChart({accessToken: this.authService.getAccessToken(), countryName: this.countryDataService.countryNames[i] }).pipe(catchError(error => of(error)), map(chart => ({...chart, country: this.countryDataService.countryNames[i]})));
      requests.push(request);
    }

   forkJoin(requests).subscribe( 
    responseList => {
      for (let chart of responseList) {
        if (chart && chart.tracks) {
          const playlistItems = chart.tracks.items as SpotifyPlaylistTrackObject[];

          if (playlistItems) {
            this.charts.set(chart.country, chart);
          }
        }
      }
      this.fetchNextCountry(at + step, stop);
    },
    err => {
      console.log("An error occured: " + err);
    });
  }

  private readyToRender() {
    for (let chart of this.charts) {
      //const playlistItems = chart.tracks.items as SpotifyPlaylistTrackObject[];
      //console.log(chart.country + " : " + playlistItems[0].track.name);
      
      //console.log(chart);
    }

    this.renderingService.init(this.charts);
    this.animationService.animate();
  }
}
