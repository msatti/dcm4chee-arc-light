import {Component, OnInit, ViewContainerRef} from '@angular/core';
import {Http} from "@angular/http";
import {QueuesService} from "./queues.service";
import {map} from "rxjs/operator/map";
import {AppService} from "../app.service";
import {User} from "../models/user";
import {ConfirmComponent} from "../widgets/dialogs/confirm/confirm.component";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";
import {MdDialogRef, MdDialog, MdDialogConfig} from "@angular/material";
import {DatePipe} from "@angular/common";

@Component({
  selector: 'app-queues',
  templateUrl: './queues.component.html',
  styleUrls: ['./queues.component.css']
})
export class QueuesComponent {
    matches = [];
    limit = 20;
    queues = [];
    queueName = null;
    status = "*";
    before = new Date();
    isRole:any;
    user:User;
    dialogRef: MdDialogRef<any>;
    constructor(public $http: Http, public service:QueuesService,public mainservice:AppService,  public cfpLoadingBar:SlimLoadingBarService, public viewContainerRef: ViewContainerRef,public dialog: MdDialog, public config: MdDialogConfig) {
        this.init();
        let $this = this;
        if(!this.mainservice.user){
            // console.log("in if studies ajax");
            this.mainservice.user = this.mainservice.getUserInfo().share();
            this.mainservice.user
                .subscribe(
                    (response) => {
                        $this.user.user  = response.user;
                        $this.mainservice.user.user = response.user;
                        $this.user.roles = response.roles;
                        $this.mainservice.user.roles = response.roles;
                        $this.isRole = (role)=>{
                            if(response.user === null && response.roles.length === 0){
                                return true;
                            }else{
                                if(response.roles && response.roles.indexOf(role) > -1){
                                    return true;
                                }else{
                                    return false;
                                }
                            }
                        };
                    },
                    (response) => {
                        // $this.user = $this.user || {};
                        console.log("get user error");
                        $this.user.user = "user";
                        $this.mainservice.user.user = "user";
                        $this.user.roles = ["user","admin"];
                        $this.mainservice.user.roles = ["user","admin"];
                        $this.isRole = (role)=>{
                            if(role === "admin"){
                                return false;
                            }else{
                                return true;
                            }
                        };
                    }
                );

        }else{
            this.user = this.mainservice.user;
            this.isRole = this.mainservice.isRole;
        }
    }
    search(offset) {
        let $this = this;
        $this.cfpLoadingBar.start();
        this.service.search(this.queueName, this.status, offset, this.limit)
            .map(res => res.json())
            .subscribe((res) => {
                console.log("res2",res);
                console.log("res",res.length);
                if(res && res.length > 0){
                    $this.matches = res.map((properties, index) => {
                        $this.cfpLoadingBar.complete();
                        return {
                            offset: offset + index,
                            properties: properties,
                            showProperties: false
                        };
                    });
                }else{
                    $this.cfpLoadingBar.complete();
                    $this.mainservice.setMessage({
                        "title": "Info",
                        "text": "No queues found!",
                        "status":'info'
                    });
                }
            }, (err) =>{
                console.log("err",err);
            });
    };

    scrollToDialog(){
        let counter = 0;
        let i = setInterval(function(){
            if(($(".md-overlay-pane").length > 0)) {
                clearInterval(i);
                $('html, body').animate({
                    scrollTop: ($(".md-overlay-pane").offset().top)
                }, 200);
            }
            if(counter > 200){
                clearInterval(i);
            }else{
                counter++;
            }
        }, 50);
    }
    confirm(confirmparameters){
        this.scrollToDialog();
        this.config.viewContainerRef = this.viewContainerRef;
        this.dialogRef = this.dialog.open(ConfirmComponent, this.config);
        this.dialogRef.componentInstance.parameters = confirmparameters;
        return this.dialogRef.afterClosed();
    };
    cancel(match) {
        let $this = this;
        $this.cfpLoadingBar.start();
        this.service.cancel(this.queueName, match.properties.id)
            .subscribe(function (res) {
                match.properties.status = 'CANCELED';
                $this.cfpLoadingBar.complete();
            });
    };
    reschedule(match) {
        let $this = this;
        $this.cfpLoadingBar.start();
        this.service.reschedule(this.queueName, match.properties.id)
            .subscribe((res) => {
                $this.search(0);
                $this.cfpLoadingBar.complete();
            });
    };
    delete(match) {
        let $this = this;
        this.confirm({
            content:'Are you sure you want to delete?'
        }).subscribe(result => {
            if(result){
                $this.cfpLoadingBar.start();

                this.service.delete(this.queueName, match.properties.id)
                .subscribe((res) => {
                    $this.search($this.matches[0].offset);
                    $this.cfpLoadingBar.complete()
                });
            }
        });
    };
    flushBefore() {
        let $this = this;
        let datePipeEn = new DatePipe('us-US');
        let beforeDate = datePipeEn.transform(this.before,'yyyy-mm-dd');
        console.log("beforeDate",beforeDate);
        this.confirm({
            content:'Are you sure you want to flush before: ' + beforeDate + '?'
        }).subscribe(result => {
            if(result){
                $this.cfpLoadingBar.start();
                this.service.flush(this.queueName, this.status, this.before)
                    .map(res => res.json())
                    .subscribe((res) => {
                        console.log("resflush",res);
                        $this.mainservice.setMessage({
                            "title": "Info",
                            "text": res.deleted + " queues deleted successfully!",
                            "status":"info"
                        });
                        $this.search(0);
                        $this.cfpLoadingBar.complete();
                    },(err)=>{
                        $this.mainservice.setMessage({
                            "title": "Error " + err.status,
                            "text": err.statusText,
                            "status": "error"
                        });
                    });
            }
        });
    };
    hasOlder(objs) {
        return objs && (objs.length === this.limit);
    };
    hasNewer(objs) {
        return objs && objs.length && objs[0].offset;
    };
    newerOffset(objs) {
        return Math.max(0, objs[0].offset - this.limit);
    };
    olderOffset(objs) {
        return objs[0].offset + this.limit;
    };

    init() {
        let $this = this;
        $this.cfpLoadingBar.start();
        this.$http.get("../queue")
            .map(res => res.json())
            .subscribe((res) => {
            $this.queues = res;
            $this.queueName = res[0].name;
            $this.cfpLoadingBar.complete();
        })
    }
}
